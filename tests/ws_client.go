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
	timeout := flag.Duration("timeout", 3*time.Second, "read timeout")
	readyFile := flag.String("ready", "", "write this file after websocket connects")
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
	if *readyFile != "" {
		if err := os.WriteFile(*readyFile, []byte("ready\n"), 0644); err != nil {
			die(err)
		}
	}

	var payload any
	eventType := "ping"
	switch *mode {
	case "ping":
		payload = map[string]any{}
	case "listen", "noevent":
		// Listener-only modes are used by fan-out tests with multiple clients.
	case "private":
		eventType = "chat.send"
		payload = map[string]any{"to_user_id": *toUserID, "body": *body}
	case "group":
		eventType = "group_chat.send"
		payload = map[string]any{"group_id": *groupID, "body": *body}
	default:
		die(fmt.Errorf("unknown mode %q", *mode))
	}

	if *mode != "listen" && *mode != "noevent" {
		payloadBytes, _ := json.Marshal(payload)
		if err := conn.WriteJSON(event{Type: eventType, Payload: payloadBytes}); err != nil {
			die(err)
		}
	}

	if *expect == "" {
		if *hold > 0 {
			time.Sleep(*hold)
		}
		return
	}

	_ = conn.SetReadDeadline(time.Now().Add(*timeout))
	for {
		var ev event
		if err := conn.ReadJSON(&ev); err != nil {
			if *mode == "noevent" {
				fmt.Println("noevent")
				return
			}
			die(err)
		}
		if ev.Type == *expect {
			if *mode == "noevent" {
				die(fmt.Errorf("unexpected event %q", ev.Type))
			}
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
