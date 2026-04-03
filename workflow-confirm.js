(function () {
  "use strict";

  var APP_ID = 11;
  var ACTION_NAME = "I Comply";
  var COMPLETED_STATUS = "Completed";

  // -------------------------------------------------------
  // Prevent accidental record save in this confirmation app
  // -------------------------------------------------------
  kintone.events.on("app.record.create.submit", function (event) {
    event.error = "Please use the confirmation button below.";
    return event;
  });

  // -------------------------------------------------------
  // Main confirmation UI
  // -------------------------------------------------------
  kintone.events.on("app.record.create.show", function (event) {

    var query = new URLSearchParams(window.location.search);
    var recordId = query.get("recordId");

    var headerEl = kintone.app.record.getHeaderMenuSpaceElement();

    // --- Build UI ---
    var wrapper = document.createElement("div");
    wrapper.style.cssText = [
      "max-width:560px",
      "margin:24px auto",
      "padding:32px",
      "background:#fff",
      "border:1px solid #d9d9d9",
      "border-radius:6px",
      "font-family:Arial,sans-serif",
      "box-shadow:0 2px 8px rgba(0,0,0,.08)",
    ].join(";");

    var title = document.createElement("h2");
    title.textContent = "Compliance Confirmation";
    title.style.cssText = "margin:0 0 16px;font-size:20px;color:#222;";

    var body = document.createElement("p");
    body.innerHTML =
      "By clicking <strong>I Comply</strong> below, you acknowledge that you have " +
      "reviewed the associated document and that you fully comply with all of its " +
      "terms, conditions, and obligations.";
    body.style.cssText = "font-size:15px;line-height:1.7;color:#444;margin:0 0 24px;";

    var statusMsg = document.createElement("div");
    statusMsg.style.cssText = "min-height:24px;margin-bottom:16px;font-size:14px;font-weight:bold;";

    var btn = document.createElement("button");
    btn.textContent = ACTION_NAME;
    btn.style.cssText = [
      "background:#0057e7",
      "color:#fff",
      "border:none",
      "padding:12px 28px",
      "font-size:15px",
      "border-radius:4px",
      "cursor:pointer",
      "transition:background .2s",
    ].join(";");

    wrapper.appendChild(title);
    wrapper.appendChild(body);
    wrapper.appendChild(statusMsg);
    wrapper.appendChild(btn);
    headerEl.appendChild(wrapper);

    // --- Helpers ---
    function setStatus(msg, color) {
      statusMsg.textContent = msg;
      statusMsg.style.color = color || "#222";
    }

    function disableBtn(label) {
      btn.disabled = true;
      btn.textContent = label || ACTION_NAME;
      btn.style.background = "#aaa";
      btn.style.cursor = "not-allowed";
    }

    // --- Guard: no recordId in URL ---
    if (!recordId) {
      disableBtn(ACTION_NAME);
      setStatus("No record ID found in the URL. Please use the link from your email.", "#c0392b");
      return event;
    }

    // --- Check current status on load ---
    kintone.api(kintone.api.url("/k/v1/record", true), "GET", {
      app: APP_ID,
      id: recordId,
    }).then(function (resp) {
      var status = resp.record["$status"] && resp.record["$status"].value;
      if (status === COMPLETED_STATUS) {
        disableBtn(ACTION_NAME);
        setStatus("This record is already " + COMPLETED_STATUS + ". No further action is needed.", "#c0392b");
      }
    }).catch(function (err) {
      disableBtn(ACTION_NAME);
      setStatus(
        "Could not retrieve record #" + recordId + ": " + (err.message || JSON.stringify(err)),
        "#c0392b"
      );
    });

    // --- Button click ---
    btn.addEventListener("click", function () {
      disableBtn("Processing…");
      setStatus("");

      // Re-check status before acting (race-condition guard)
      kintone.api(kintone.api.url("/k/v1/record", true), "GET", {
        app: APP_ID,
        id: recordId,
      }).then(function (resp) {
        var status = resp.record["$status"] && resp.record["$status"].value;
        if (status === COMPLETED_STATUS) {
          setStatus("This record is already " + COMPLETED_STATUS + ". No action was taken.", "#c0392b");
          return null; // skip workflow call
        }

        return kintone.api(kintone.api.url("/k/v1/record/status", true), "PUT", {
          app: APP_ID,
          id: recordId,
          action: ACTION_NAME,
        });
      }).then(function (resp) {
        if (!resp) return; // already-completed path
        btn.textContent = "Confirmed";
        btn.style.background = "#27ae60";
        btn.style.cursor = "default";
        setStatus("Your compliance has been recorded successfully. Thank you.", "#27ae60");
      }).catch(function (err) {
        // Re-enable so user can retry
        btn.disabled = false;
        btn.textContent = ACTION_NAME;
        btn.style.background = "#0057e7";
        btn.style.cursor = "pointer";
        setStatus(
          "Error: " + (err.message || JSON.stringify(err)),
          "#c0392b"
        );
      });
    });

    return event;
  });

})();
