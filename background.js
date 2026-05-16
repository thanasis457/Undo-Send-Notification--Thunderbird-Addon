let pending_emails = {}
let saved_window_state = {}

function notificationCleanup(notification_id) {
  delete pending_emails[notification_id];
  delete saved_window_state[notification_id];
  messenger.notifications.clear(notification_id);
}

messenger.compose.onBeforeSend.addListener((tab, details) => {
  return new Promise((resolve) => {
    messenger.notifications.create({
      message: `Click to unsend email\nSubject: ${details?.subject ?? "[(No subject)]"}\n${details.plainTextBody}`,
      title: "Sending in 10 seconds...",
      type: "basic",
      isClickable: true,
      priority: 2
    }).then((notification_id) => {
      let timeout_id = setTimeout(() => {
        notificationCleanup(notification_id);
        resolve();
      }, 10000);

      pending_emails[notification_id] = () => {
        console.debug("Clearing");
        clearTimeout(timeout_id);
        resolve({ cancel: true });
      };
      
      setTimeout(() => {
        messenger.windows.get(tab.windowId).then((window) => {
          saved_window_state[notification_id] = {
            window_id: tab.windowId,
            window_dims: [window.width, window.height, window.top, window.left]
          }  
          messenger.windows.update(tab.windowId, { state: "minimized" });
        })
      }, 100);
    }).catch((e) => console.log(e))
  })
})

messenger.notifications.onClicked.addListener(async (notification_id, byUser) => {
  if (notification_id in pending_emails) {
    pending_emails[notification_id]();
  }
  if (notification_id in saved_window_state) {
    messenger.windows.update(saved_window_state[notification_id].window_id, {
      width: saved_window_state[notification_id].window_dims[0],
      height: saved_window_state[notification_id].window_dims[1],
      top: saved_window_state[notification_id].window_dims[2],
      left: saved_window_state[notification_id].window_dims[3],
      state: "normal"
    });
  }
  notificationCleanup(notification_id);
})
