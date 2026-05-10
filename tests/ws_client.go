package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

type event struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

func main() {
	base := flag.String("base", "http://localhost:8080", "backend base URL")
	cookieJar := flag.String("cookie", "", "curl cookie jar")
	mode := flag.String("mode", "ping", "ping|private|group")
	toUserID := flag.Int64("to-user", 0, "private chat receiver id")
	groupID := flag.Int64("group", 0, "group chat id")
	body := flag.String("body", "hello over websocket", "message body")
	expect := flag.String("expect", "pong", "event type expected from server")
	hold := flag.Duration("hold", 0, "keep websocket open after expected event")
	flag.Parse()

	token, err := sessionToken(*cookieJar)
	if err != nil {
		die(err)
	}
	wsURL, err := toWSURL(*base)
	if err != nil {
		die(err)
	}

	header := http.Header{}
	header.Set("Cookie", "session_token="+token)
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		die(err)
	}
	defer conn.Close()

	var payload any
	eventType := "ping"
	switch *mode {
	case "ping":
		payload = map[string]any{}
	case "private":
		eventType = "chat.send"
		payload = map[string]any{"to_user_id": *toUserID, "body": *body}
	case "group":
		eventType = "group_chat.send"
		payload = map[string]any{"group_id": *groupID, "body": *body}
	default:
		die(fmt.Errorf("unknown mode %q", *mode))
	}

	payloadBytes, _ := json.Marshal(payload)
	if err := conn.WriteJSON(event{Type: eventType, Payload: payloadBytes}); err != nil {
		die(err)
	}

	if *expect == "" {
		return
	}

	_ = conn.SetReadDeadline(time.Now().Add(3 * time.Second))
	for {
		var ev event
		if err := conn.ReadJSON(&ev); err != nil {
			die(err)
		}
		if ev.Type == *expect {
			fmt.Println(ev.Type)
			if *hold > 0 {
				time.Sleep(*hold)
			}
			return
		}
	}
}

func toWSURL(base string) (string, error) {
	u, err := url.Parse(base)
	if err != nil {
		return "", err
	}
	switch u.Scheme {
	case "https":
		u.Scheme = "wss"
	default:
		u.Scheme = "ws"
	}
	u.Path = "/ws"
	u.RawQuery = ""
	return u.String(), nil
}

func sessionToken(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		line = strings.TrimPrefix(line, "#HttpOnly_")
		if strings.HasPrefix(line, "#") || strings.TrimSpace(line) == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) >= 7 && fields[5] == "session_token" {
			return fields[6], nil
		}
	}
	if err := scanner.Err(); err != nil {
		return "", err
	}
	return "", fmt.Errorf("session_token not found in %s", path)
}

func die(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
