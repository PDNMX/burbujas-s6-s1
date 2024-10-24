let currentData = null;
let allData = null;
let currentEmpresa = "";
let visualization = null;

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
      hasSistema2: empresa.participaciones.some((p) =>
        p.sistema2 &&
        p.sistema2.institucionDependencia &&
        p.sistema2.institucionDependencia.nombre &&
        sistema6.buyer &&
        sistema6.buyer.name &&
        p.sistema2.institucionDependencia.nombre.toLowerCase() === sistema6.buyer.name.toLowerCase()
      ),
      hasEntePublicoMatch: empresa.participaciones.some(
        (p) =>
          p.nombreEntePublico &&
          sistema6.buyer &&
          sistema6.buyer.name &&
          p.nombreEntePublico.toLowerCase() === sistema6.buyer.name.toLowerCase()
      ),
      isSupplier: sistema6.partiesMatch.isSupplier,
    })),
  }));
}



// Función para filtrar los datos
function filterData(data, onlySistema2, onlyEntePublicoMatch, onlySupplier, searchTerm = '') {
  currentEmpresa = "";
  return data
    .map((empresa) => {
      if (searchTerm && !empresa.nombreEmpresa.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !empresa.rfc.toLowerCase().includes(searchTerm.toLowerCase())) {
        return null;
      }

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
    .filter((empresa) => empresa && empresa.children.length > 0);
}

function renderTreemap(transformedData) {
  const backButton = document.getElementById("backButton");
  const leyendaColores = document.getElementById("leyendaColores");
  const supplierCheckbox = document.getElementById("supplierFilter");
  const sistema2Checkbox = document.getElementById("sistema2Filter");
  const entePublicoCheckbox = document.getElementById("entePublicoFilter");
  const cardDetalleParticipaciones = document.getElementById("cardDetalleParticipaciones");
  const searchInput = document.getElementById("searchInput");
  const loadingSpinner = document.getElementById("loadingSpinner");
  // Función debounce para optimizar la búsqueda
  const debouncedApplyFilters = _.debounce(applyFilters, 300);

  function applyFilters() {
    loadingSpinner.style.display = "inline-block";

    setTimeout(() => {
      const filteredData = filterData(
        allData,
        sistema2Checkbox.checked,
        entePublicoCheckbox.checked,
        supplierCheckbox.checked,
        searchInput.value
      );

      currentData = filteredData;
      console.log(currentData)

      visualization.config({ data: filteredData }).render();
      backButton.style.display = "none";
      leyendaColores.style.display = "none";
      cardDetalleParticipaciones.style.display = "none";
      document.getElementById("detalleParticipaciones").innerHTML = "";

      loadingSpinner.style.display = "none";
    }, 0);
  }

  const visualization = new d3plus.Treemap()
    .data(transformedData)
    .groupBy(["empresa", "id"])
    .sum("value")
    .shapeConfig({
      /* fill: d => d.empresa === "IPN" ? "green" : "orange", */
      label: (d) => {
        if (d.children /* && d.children.length > 0 */) {
          return `${d.empresa}\n<b>Licitaciones:</b> ${d.value.toLocaleString()}\n<b>RFC:</b> ${d.rfc}`;
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
      if (d.children /* && d.children.length > 0 */) {
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
        // Colores en tonos azules según el valor de d.value
        if (d.value < 10) {
          return "#68B4D2"; // Azul muy claro
        } else if (d.value < 50) {
          return "#7FB6E8"; // Azul claro
        } else if (d.value < 100) {
          return "#B39CD8"; // Azul intermedio
        } else if (d.value < 500) {
          return "#D5A7E5"; // Azul más oscuro
        } else {
          return "#A88A9B"; // Azul muy oscuro
        }
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
    .noDataHTML(() => {
      return `<div style="left: 50%; top: 50%; position: absolute; transform: translate(-50%, -50%);">
        <i class="fa fa-exclamation-triangle fa-3x text-muted mb-3"></i>
        <h4 class="mb-3">No hay información disponible</h4>
        <p class="text-muted">
          No se encontraron datos que coincidan con los criterios de búsqueda actuales.
          <br>Intenta ajustar los filtros o realizar una nueva búsqueda.
        </p>
      
    </div>`
    })
    .loadingMessage(true)
    .loadingHTML(() => {
      return `<div style="left: 50%; top: 50%; position: absolute; transform: translate(-50%, -50%);">
        <i class="fa fa-exclamation-triangle fa-3x text-muted mb-3"></i>
        <h4 class="mb-3">Cargando información...</h4>     
    </div>`
    })
    .legend(false)
    .tooltipConfig({
      background: "rgba(255, 255, 255, 0.9)",
      border: "2px solid #ddd",
      borderRadius: "0px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      fontSize: "12px",
      padding: "10px",
      tbody: function (d) {
        let rows = [];
        if (d.children /* && d.children.length > 0 */) {
          rows.push([
            "<strong style='color: #333; float: left; margin-right: 5px;'>Licitaciones:</strong>",
            `<span style='color: #007bff; float: left;'>${d.value.toLocaleString()}</span>`
          ]);
          rows.push([
            "<strong style='color: #333; float: left; '>RFC:</strong>",
            `<span style='color: #28a745; float: left;'>${d.rfc || "No disponible"}</span>`
          ]);
        } else if (d.tender) {
          rows = [
            [
              "<strong style='color: #333; float: left; margin-right: 5px;'>Título de la licitación:</strong>",
              `<span style='color: #007bff; float: left;'>${d.tenderTitle || "No disponible"}</span>`
            ],
            [
              "<strong style='color: #333; float: left; margin-right: 5px;'>Periodo de licitación - Fecha de Inicio:</strong>",
              `<span style='color: #28a745; float: left;'>${d.tender.tenderPeriod ? d.tender.tenderPeriod.startDate || "No disponible" : "No disponible"}</span>`
            ],
            [
              "<strong style='color: #333; float: left; margin-right: 5px;'>Periodo de evaluación y adjudicación - Fecha de Término:</strong>",
              `<span style='color: #28a745; float: left;'>${d.tender.awardPeriod ? d.tender.awardPeriod.endDate || "No disponible" : "No disponible"}</span>`
            ],
            [
              "<strong style='color: #333; float: left; margin-right: 5px;'>Método de Contratación:</strong>",
              `<span style='color: #6c757d; float: left;'>${d.tender.procurementMethod || "No disponible"}</span>`
            ],
            [
              "<strong style='color: #333; float: left; margin-right: 5px;'>Nombre del actor:</strong>",
              `<span style='color: #17a2b8; float: left;'>${d.tender.procuringEntity ? d.tender.procuringEntity.name || "No disponible" : "No disponible"}</span>`
            ],
            [
              "<strong style='color: #333; float: left; margin-right: 5px;'>Estatus de la licitación:</strong>",
              `<span style='color: #ffc107; float: left;'>${d.tender.status || "No disponible"}</span>`
            ]
          ];

          if (d.planning && Array.isArray(d.planning.requestingUnits)) {
            d.planning.requestingUnits.forEach((unit, index) => {
              rows.push([
                `<strong style='color: #333; float: left; margin-right: 5px;'>${index === 0 ? `Área Requirente (${index + 1}):` : ""}</strong>`,
                `<span style='color: #6610f2; float: left;'>${unit.name || "No disponible"}</span>`
              ]);
            });
          }
        }
        return rows;
      },
      title: function (d) {
        return `<div style='font-size: 14px; font-weight: bold; color: #333; margin-bottom: 10px; text-align: left; padding-bottom: 5px; width: 100%;'>
      ${d.children ? (d.empresa || "Empresa") : (d.buyer ? d.buyer.name || "Comprador" : "Comprador")}
    </div>`;
      }
    })
    .on("click", function (d) {
      if (d.children /* && d.children.length > 0 */) {
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
        "textAnchor": "middle",
        "fill": "red",
        "color": "red"
      }
    )
    .render();

  backButton.addEventListener("click", function () {
    applyFilters();
  });
  function initializeClearFilters() {
    // Crear el botón si no existe en el HTML
    let clearFiltersBtn = document.getElementById('clearFiltersBtn');
     
    function clearAllFilters() {
      const searchInput = document.getElementById("searchInput");
      const supplierCheckbox = document.getElementById("supplierFilter");
      const sistema2Checkbox = document.getElementById("sistema2Filter");
      const entePublicoCheckbox = document.getElementById("entePublicoFilter");
  
      // Limpiar todos los filtros
      searchInput.value = "";
      supplierCheckbox.checked = false;
      sistema2Checkbox.checked = false;
      entePublicoCheckbox.checked = false;
  
      // Ocultar spinner de búsqueda si está visible
      const loadingSpinner = document.getElementById("loadingSpinner");
      if (loadingSpinner) {
        loadingSpinner.style.display = "none";
      }
  
      // Restablecer estado global
      currentEmpresa = "";
      
      // Aplicar los filtros
      if (typeof applyFilters === 'function') {
        applyFilters();
      }
  
      updateClearFiltersVisibility();
    }
  
    function updateClearFiltersVisibility() {
      const searchInput = document.getElementById("searchInput");
      const supplierCheckbox = document.getElementById("supplierFilter");
      const sistema2Checkbox = document.getElementById("sistema2Filter");
      const entePublicoCheckbox = document.getElementById("entePublicoFilter");
  
      const hasActiveFilters = searchInput.value !== "" || 
                             supplierCheckbox.checked || 
                             sistema2Checkbox.checked || 
                             entePublicoCheckbox.checked;
  
      clearFiltersBtn.style.opacity = hasActiveFilters ? "1" : "0.5";
      clearFiltersBtn.disabled = !hasActiveFilters;
    }
  
    // Agregar event listeners
    const inputs = [
      document.getElementById("searchInput"),
      document.getElementById("supplierFilter"),
      document.getElementById("sistema2Filter"),
      document.getElementById("entePublicoFilter")
    ];
  
    inputs.forEach(input => {
      if (input) {
        input.addEventListener(input.type === 'text' ? 'input' : 'change', updateClearFiltersVisibility);
      }
    });
  
    clearFiltersBtn.addEventListener('click', clearAllFilters);
    updateClearFiltersVisibility();
  }
  supplierCheckbox.addEventListener("change", debouncedApplyFilters);
  sistema2Checkbox.addEventListener("change", debouncedApplyFilters);
  entePublicoCheckbox.addEventListener("change", debouncedApplyFilters);
  searchInput.addEventListener("input", debouncedApplyFilters);
  initializeClearFilters();
}



function updateParticipacionesDetails(d) {
  var detalleDiv = document.getElementById("detalleParticipaciones");
  detalleDiv.innerHTML = "";

  if (d.participaciones) {
    let participaciones = Array.isArray(d.participaciones)
      ? d.participaciones
      : [d.participaciones];

    // Filtrar participaciones duplicadas
    const uniqueSet = new Set();
    participaciones = participaciones.filter(participacion => {
      const fullName = `${participacion.nombre || ""} ${participacion.primerApellido || ""} ${participacion.segundoApellido || ""}`.trim();
      const ente = participacion.nombreEntePublico || "Ente no disponible";
      const key = `${fullName}|${ente}`;
      if (uniqueSet.has(key)) {
        return false;
      }
      uniqueSet.add(key);
      return true;
    });

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

      // Contenido principal
      var mainContent = `
        <div><strong>Cargo:</strong> ${participacion.empleoCargoComision || "No disponible"}</div>
        <div><strong>Fecha de posesión:</strong> ${participacion.fechaTomaPosesion || "No disponible"}</div>
        <div><strong>Contratado por honorarios:</strong> ${participacion.contratadoPorHonorarios !== undefined ? (participacion.contratadoPorHonorarios ? "Sí" : "No") : "No disponible"}</div>
        <div><strong>Área de adscripción:</strong> ${participacion.areaAdscripcion || "No disponible"}</div>
        <div><strong>Porcentaje de participación:</strong> ${participacion.porcentajeParticipacion !== undefined ? (participacion.porcentajeParticipacion >= 50 ? `<span class="badge bg-danger">${participacion.porcentajeParticipacion}%</span>` : `${participacion.porcentajeParticipacion}%` ) : "No disponible"} </div>        
        <div><strong>Recibe remuneración:</strong> ${participacion.recibeRemuneracion !== undefined ? (participacion.recibeRemuneracion ? "Sí" : "No") : "No disponible"}</div>
        <div><strong>Tipo de participación:</strong> ${participacion.tipoParticipacion || "No disponible"}</div>
        <div><strong>Sector de participación:</strong> ${participacion.sectorParticipacion || "No disponible"}</div>
      `;

      body.innerHTML = mainContent;

      // Contenido de sistema2
      if (participacion.sistema2) {
        var s2 = participacion.sistema2;
        var sistema2Content = `
          <div class="mt-2">
            <div style="color: #b25fac; font-weight: bold;">Información del Sistema 2:</div>
            <ul>
              <li style="color: #b25fac;"><strong>Nombres:</strong> ${s2.nombres || "No disponible"}</li>
              <li style="color: #b25fac;"><strong>Primer Apellido:</strong> ${s2.primerApellido || "No disponible"}</li>
              <li style="color: #b25fac;"><strong>Segundo Apellido:</strong> ${s2.segundoApellido || "No disponible"}</li>
              <li style="color: #b25fac;"><strong>Institución: </strong><span class="badge bg-secondary"> ${s2.institucionDependencia?.nombre || "No disponible"} </span></li>
              <li style="color: #b25fac;"><strong>Puesto:</strong> ${s2.puesto?.nombre || "No disponible"}</li>
              <li style="color: #b25fac;"><strong>Nivel:</strong> ${s2.puesto?.nivel || "No disponible"}</li>
              <li style="color: #b25fac;"><strong>Nivel de Responsabilidad:</strong> ${s2.nivelResponsabilidad?.map(nr => nr.valor).join(", ") || "No disponible"}</li>
              <li style="color: #b25fac;"><strong>Tipo de Procedimiento:</strong> ${s2.tipoProcedimiento?.map(tp => tp.valor).join(", ") || "No disponible"}</li>
            </ul>
          </div>
        `;
        body.innerHTML += sistema2Content;
      }

      collapse.appendChild(body);

      // Agregar el encabezado y el cuerpo al item del accordion
      accordionItem.appendChild(header);
      accordionItem.appendChild(collapse);

      // Agregar el item al accordion
      accordion.appendChild(accordionItem);
    });

    // Agregar el accordion al div de detalles
    detalleDiv.appendChild(accordion);

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
