# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "BPMN Viewer" [level=3] [ref=e6]
      - paragraph [ref=e7]: Logga in för att hantera dina BPMN-mappningar
    - generic [ref=e9]:
      - tablist [ref=e10]:
        - tab "Logga in" [selected] [ref=e11] [cursor=pointer]
        - tab "Skapa konto" [ref=e12] [cursor=pointer]
      - tabpanel "Logga in" [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]:
            - text: Email
            - textbox "Email" [ref=e16]:
              - /placeholder: din@email.se
          - generic [ref=e17]:
            - text: Lösenord
            - textbox "Lösenord" [ref=e18]:
              - /placeholder: ••••••
          - button "Logga in" [ref=e19] [cursor=pointer]
```