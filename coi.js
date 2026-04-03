(function () {
  "use strict";

  // Evento de mostrar nuevo registro (app 11)
  kintone.events.on("app.record.create.show", function (event) {

    const query = new URLSearchParams(window.location.search);
    const firmId     = query.get("firmId");
    const contractId = query.get("contractId");

    if (!firmId && !contractId) return event;

    const promises = [];

    // Fetch firm data from app 5
    if (firmId) {
      promises.push(
        kintone.api(kintone.api.url("/k/v1/record", true), "GET", {
          app: 5,
          id: firmId,
        }).then(function (resp) {
          const source = resp.record;
          if (event.record.firmId)   event.record.firmId.value   = source.$id.value;
          if (event.record.firmName) event.record.firmName.value = source.firmName.value;
          console.log("Firm fields set:", { firmId: source.$id.value, firmName: source.firmName.value });
        })
      );
    }

    // Fetch contract data from app 9
    if (contractId) {
      promises.push(
        kintone.api(kintone.api.url("/k/v1/record", true), "GET", {
          app: 9,
          id: contractId,
        }).then(function (resp) {
          const source = resp.record;
          if (event.record.contractId) event.record.contractId.value = source.$id.value;
          if (event.record.matter)     event.record.matter.value     = source.matter?.value || "";
          if (event.record.type)       event.record.type.value       = source.type?.value || "";
          if (event.record.lawyers && source.lawyers?.value?.length)
            event.record.lawyers.value = source.lawyers.value;
          console.log("Contract fields set:", { contractId: source.$id.value, matter: source.matter?.value, type: source.type?.value, lawyers: source.lawyers?.value });
        })
      );
    }

    return Promise.all(promises).then(function () {
      return event;
    });

  });

})();
