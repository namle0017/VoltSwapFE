window._origAlert = window.alert;
window.alert = (msg) => {
  if (window.toast) window.toast.info(String(msg));
  else window._origAlert(String(msg));
};
