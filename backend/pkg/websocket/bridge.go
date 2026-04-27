// Bridge: routes inbound WebSocket events to handlers and provides
// outbound helpers used by REST handlers (e.g. notifications package).
//
// Inbound event types supported now:
//   - "chat.send"       -> private 1:1 message
//   - "group_chat.send" -> message to a group's chat
//   - "ping"            -> server replies with "pong" (debug aid)
//
// Future event types (notifications, typing indicators) plug in here.
package websocket

import (
	"encoding/json"
	"log"
)

type chatSendPayload struct {
	ToUserID int64  `json:"to_user_id"`
	Body     string `json:"body"`
}

type groupChatSendPayload struct {
	GroupID int64  `json:"group_id"`
	Body    string `json:"body"`
}

// InitBridge wires HubInstance.dispatch to handle incoming events.
// Storage callbacks (savePrivateMessage, saveGroupMessage, listGroupMembers)
// are injected so this package doesn't import db/sqlite directly.
type Storage struct {
	SavePrivateMessage func(senderID, receiverID int64, body string) (int64, error)
	SaveGroupMessage   func(groupID, senderID int64, body string) (int64, error)
	ListGroupMembers   func(groupID int64) ([]int64, error)
}

func InitBridge(store Storage) {
	HubInstance.SetDispatch(func(userID int64, ev Event) {
		switch ev.Type {
		case "ping":
			HubInstance.SendToUser(userID, Event{Type: "pong"})

		case "chat.send":
			var p chatSendPayload
			if err := json.Unmarshal(ev.Payload, &p); err != nil {
				return
			}
			if p.Body == "" || p.ToUserID == 0 {
				return
			}
			id, err := store.SavePrivateMessage(userID, p.ToUserID, p.Body)
			if err != nil {
				log.Printf("[ws] save chat error: %v", err)
				return
			}
			out := Event{Type: "chat.new", Payload: mustJSON(map[string]any{
				"id":         id,
				"from":       userID,
				"to":         p.ToUserID,
				"body":       p.Body,
			})}
			HubInstance.SendToUser(p.ToUserID, out)
			HubInstance.SendToUser(userID, out) // echo to sender's other tabs

		case "group_chat.send":
			var p groupChatSendPayload
			if err := json.Unmarshal(ev.Payload, &p); err != nil {
				return
			}
			if p.Body == "" || p.GroupID == 0 {
				return
			}
			members, err := store.ListGroupMembers(p.GroupID)
			if err != nil {
				log.Printf("[ws] list group members: %v", err)
				return
			}
			id, err := store.SaveGroupMessage(p.GroupID, userID, p.Body)
			if err != nil {
				log.Printf("[ws] save group chat: %v", err)
				return
			}
			out := Event{Type: "group_chat.new", Payload: mustJSON(map[string]any{
				"id":       id,
				"group_id": p.GroupID,
				"from":     userID,
				"body":     p.Body,
			})}
			HubInstance.SendToUsers(members, out)

		default:
			log.Printf("[ws] unknown event type=%q from user=%d", ev.Type, userID)
		}
	})
}

func mustJSON(v any) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

// PushNotification — convenience for REST handlers that want to fire a
// websocket notification synchronously (e.g. POST /api/follow).
func PushNotification(receiverID int64, payload any) {
	HubInstance.SendToUser(receiverID, Event{
		Type:    "notification.new",
		Payload: mustJSON(payload),
	})
}
