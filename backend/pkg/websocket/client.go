package websocket

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1 << 20 // 1 MiB
	sendBuffer     = 64
)

// Client is one websocket connection bound to one authenticated user.
// Note: a single user can have multiple Clients (multiple tabs/devices).
type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	userID int64
}

func NewClient(hub *Hub, conn *websocket.Conn, userID int64) *Client {
	c := &Client{
		hub:    hub,
		conn:   conn,
		send:   make(chan []byte, sendBuffer),
		userID: userID,
	}
	hub.register(c)
	return c
}

// Run starts the read and write pumps. Caller should `go client.Run()`.
func (c *Client) Run() {
	go c.writePump()
	c.readPump()
}

// readPump reads frames from the socket, decodes Event envelopes, and forwards
// them to the hub's dispatch fn. Exits when the socket dies.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister(c)
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[ws] read error user=%d: %v", c.userID, err)
			}
			return
		}
		var ev Event
		if err := json.Unmarshal(raw, &ev); err != nil {
			log.Printf("[ws] bad envelope from user=%d: %v", c.userID, err)
			continue
		}
		c.hub.dispatch(c.userID, ev)
	}
}

// writePump drains c.send and writes frames to the socket. Also sends periodic
// pings to keep the connection alive through proxies.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel — send close frame and exit.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
