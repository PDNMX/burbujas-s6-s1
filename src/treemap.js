let currentData = null;
let allData = null;
let currentEmpresa = "";

const childColors = {
  default: "#d3d3d1", // 
  withSupplier: "#FFF59D", // Amarillo claro
  withEqualEnte: "#FFB74D", // Naranja
  withSistema2: "#EF5350", // Rojo
};

// Función para transformar los datos
function processData(data) {
  return data.map((empresa) => ({
    ...empresa,
    empresa: empresa.nombreEmpresa,
    rfc: empresa.rfc,
    value: empresa.sistema6.length,
    children: empresa.sistema6.map((sistema6, sistemaIndex) => ({
      ...sistema6,
      id: sistemaIndex,
      tenderTitle: sistema6.tender.title,
      value: 1,
      hasSistema2: empresa.participaciones.some((p) => p.sistema2),
      hasEntePublicoMatch: empresa.participaciones.some(
        (p) =>
          p.nombreEntePublico &&
          sistema6.buyer &&
          sistema6.buyer.name &&
          p.nombreEntePublico.toLowerCase() ===
            sistema6.buyer.name.toLowerCase()
      ),
      isSupplier: sistema6.partiesMatch.isSupplier,
    })),
  }));
}

// Función para filtrar los datos
function filterData(data, onlySistema2, onlyEntePublicoMatch, onlySupplier) {
  currentEmpresa = ""; 
  return data
    .map((empresa) => {
      const filteredChildren = empresa.children.filter((child) => {
        if (onlySistema2 && !child.hasSistema2) return false;
        if (onlyEntePublicoMatch && !child.hasEntePublicoMatch) return false;
        if (onlySupplier && !child.isSupplier) return false;
        return true;
      });
      return {
        ...empresa,
        children: filteredChildren,
        value: filteredChildren.length,
      };
    })
    .filter((empresa) => empresa.children.length > 0);
}

function renderTreemap(transformedData) { 
  const backButton = document.getElementById("backButton");
  const leyendaColores = document.getElementById("leyendaColores");
  const supplierCheckbox = document.getElementById("supplierFilter");
  const sistema2Checkbox = document.getElementById("sistema2Filter");
  const entePublicoCheckbox = document.getElementById("entePublicoFilter");
  const cardDetalleParticipaciones = document.getElementById("cardDetalleParticipaciones");

  function applyFilters() {
    const filteredData = filterData(
      allData,
      sistema2Checkbox.checked,
      entePublicoCheckbox.checked,
      supplierCheckbox.checked
    );

    currentData = filteredData;
    visualization.config({ data: filteredData }).render();
    backButton.style.display = "none";
    leyendaColores.style.display = "none";
    cardDetalleParticipaciones.style.display = "none";
    document.getElementById("detalleParticipaciones").innerHTML = "";
  }

  const visualization = new d3plus.Treemap()
    .data(transformedData)
    .groupBy(["empresa", "id"])
    .sum("value")
    .shapeConfig({
      /* fill: d => d.empresa === "IPN" ? "green" : "orange", */
      label: (d) => {
        if (d.children && d.children.length > 0) {
          return `${d.empresa}\nParticipaciones: ${d.value.toLocaleString()}`;
        } else {
          let label = d.buyer
            ? d.buyer.name || "No disponible"
            : "No disponible";

          if (d.isSupplier) {
            label = "★ " + label;
          }
          if (d.hasEntePublicoMatch) {
            label = "⚑  " + label;
          }
          if (d.hasSistema2) label = "✓ " + label;
          return label;
        }
      },
    })
    .select("#chart")
    // label en title del tooltip
    .label(function (d) {
      if (d.children && d.children.length > 0) {
        return d.empresa;
      } else {
        //console.log(d)
        let label = d.buyer ? d.buyer.name || "No disponible" : "No disponible";
        return label;
      }
    })
    .sum("value")
    .tile("squarify")
    .color((d) => {
      if (d.children) {
        // Color para rectángulos padres basado en el valor
        return d.value;
      } else {
        // Color para rectángulos hijos
        if (d.isSupplier && d.hasSistema2) {
          return childColors.withSistema2;
        } else if (d.hasEntePublicoMatch) {
          return childColors.withEqualEnte;
        } else if (d.isSupplier) {
          return childColors.withSupplier;
        } else {
          return childColors.default;
        }
      }
    })
    .legend(false)
    .tooltipConfig({
      tbody: function (d) {
        let rows = [];
        if (d.children && d.children.length > 0) {
          rows.push(["Participaciones", d.value.toLocaleString()]);
          rows.push(["RFC", d.rfc || "No disponible"]);
        } else {
          /* rows.push([
            "Nombre de la Empresa",
            d.empresa || "No disponible",
          ]); */
          if (d.tender) {
            rows.push([
              "Nombre de la Contratación",
              d.tenderTitle || "No disponible"
            ]);
            rows.push([
              "Fecha de Inicio",
              d.tender.tenderPeriod
                ? d.tender.tenderPeriod.startDate || "No disponible"
                : "No disponible",
            ]);
            rows.push([
              "Fecha de Finalización",
              d.tender.awardPeriod
                ? d.tender.awardPeriod.endDate || "No disponible"
                : "No disponible",
            ]);
            rows.push([
              "Método de Adquisición",
              d.tender.procurementMethod || "No disponible",
            ]);
            rows.push([
              "Entidad Compradora",
              d.tender.procuringEntity
                ? d.tender.procuringEntity.name || "No disponible"
                : "No disponible",
            ]);
            rows.push([
              "Estado del Proceso",
              d.tender.status || "No disponible",
            ]);
          }
        }
        return rows;
      },
    })
    .on("click", function (d) {
      if (d.children && d.children.length > 0) {
        currentData = transformedData;
        currentEmpresa = d.empresa;
        backButton.style.display = "block";
        leyendaColores.style.display = "block";
        cardDetalleParticipaciones.style.display = "block";
        visualization.config({ data: d.children }).render();
        updateParticipacionesDetails(d)
      } /* else {
        //applyFilters();
        backButton.style.display = "none";
        visualization.config({ data: transformedData }).render();
        
      } */
      //updateParticipacionesDetails(d);
    })
    .title(() => {
      return currentEmpresa || false;
    })
    .titleConfig(
      {
        "ariaHidden": true,
        "fontSize": 20,
        "padding": 3,
        "resize": true,
        "textAnchor": "middle"
      }
    )
    .render();

  backButton.addEventListener("click", function () {
    applyFilters();
    if (currentData) {
      currentEmpresa = ""; 
      visualization.config({ data: currentData }).render();
      backButton.style.display = "none";
      leyendaColores.style.display = "none";
      cardDetalleParticipaciones.style.display = "none";
      document.getElementById("detalleParticipaciones").innerHTML = "";
    }
  });

  supplierCheckbox.addEventListener("change", applyFilters);
  sistema2Checkbox.addEventListener("change", applyFilters);
  entePublicoCheckbox.addEventListener("change", applyFilters);
}

function updateParticipacionesDetails(d) {
  var detalleDiv = document.getElementById("detalleParticipaciones");
  detalleDiv.innerHTML = "";

  if (d.participaciones) {
    let participaciones = Array.isArray(d.participaciones)
      ? d.participaciones
      : [d.participaciones];

    // Crear el contenedor del accordion
    var accordion = document.createElement("div");
    accordion.className = "accordion accordion-flush";
    var accordionId = "participacionesAccordion" + Date.now(); // ID único
    accordion.id = accordionId;

    participaciones.forEach(function (participacion, index) {
      var accordionItem = document.createElement("div");
      accordionItem.className = "accordion-item";

      var headerId = `heading${accordionId}${index}`;
      var collapseId = `collapse${accordionId}${index}`;

      // Crear el encabezado del accordion
      var header = document.createElement("h2");
      header.className = "accordion-header";
      header.id = headerId;

      var button = document.createElement("button");
      button.className = "accordion-button collapsed";
      button.type = "button";
      button.setAttribute("data-bs-toggle", "collapse");
      button.setAttribute("data-bs-target", `#${collapseId}`);
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-controls", collapseId);
      
      // Añadir icono de Font Awesome
      var icon = document.createElement("i");
      icon.className = "fa fa-user fa-fw me-2";
      button.appendChild(icon);

      // Añadir texto
      var textSpan = document.createElement("span");
      textSpan.innerHTML = `${participacion.nombre || ""} ${participacion.primerApellido || ""} ${participacion.segundoApellido || ""} - ${participacion.nombreEntePublico || "Ente no disponible"}`;
      button.appendChild(textSpan);

      header.appendChild(button);

      // Crear el cuerpo del accordion
      var collapse = document.createElement("div");
      collapse.id = collapseId;
      collapse.className = "accordion-collapse collapse";
      collapse.setAttribute("aria-labelledby", headerId);
      collapse.setAttribute("data-bs-parent", `#${accordionId}`);

      var body = document.createElement("div");
      body.className = "accordion-body";
      body.innerHTML = `
        <strong>Porcentaje de participación:</strong> ${participacion.porcentajeParticipacion !== undefined ? participacion.porcentajeParticipacion + "%" : "No disponible"}<br>
        <strong>Recibe remuneración:</strong> ${participacion.recibeRemuneracion !== undefined ? (participacion.recibeRemuneracion ? "Sí" : "No") : "No disponible"}<br>
        <strong>Tipo de participación:</strong> ${participacion.tipoParticipacion || "No disponible"}<br>
        <strong>Sector de participación:</strong> ${participacion.sectorParticipacion || "No disponible"}<br>
        <strong>Cargo:</strong> ${participacion.empleoCargoComision || "No disponible"}<br>
        <strong>Fecha de posesión:</strong> ${participacion.fechaTomaPosesion || "No disponible"}<br>
        <strong>Contratado por honorarios:</strong> ${participacion.contratadoPorHonorarios !== undefined ? (participacion.contratadoPorHonorarios ? "Sí" : "No") : "No disponible"}<br>
        <strong>Sistema 2:</strong> ${participacion.sistema2 ? "Sí" : "No"}
      `;

      collapse.appendChild(body);

      // Agregar el encabezado y el cuerpo al item del accordion
      accordionItem.appendChild(header);
      accordionItem.appendChild(collapse);

      // Agregar el item al accordion
      accordion.appendChild(accordionItem);
    });

    // Agregar el accordion al div de detalles
    detalleDiv.appendChild(accordion);

    // No es necesario inicializar manualmente el accordion en Bootstrap 5
  } else {
    detalleDiv.innerHTML = "<p>No hay detalles de participaciones disponibles.</p>";
  }
}
// Uso de la función
fetch("data/treemap.json")
  .then((response) => response.json())
  .then((data) => {
    allData = processData(data);
    renderTreemap(allData);
  })
  .catch((error) => console.error("Error al cargar los datos:", error));
