let currentData = null;
let allData = null;

const parentColors = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
];
const childColors = [
  "#aec7e8",
  "#ffbb78",
  "#98df8a",
  "#ff9896",
  "#c5b0d5",
  "#c49c94",
  "#f7b6d2",
  "#c7c7c7",
  "#dbdb8d",
  "#9edae5",
];

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
  const supplierCheckbox = document.getElementById("supplierFilter");
  const sistema2Checkbox = document.getElementById("sistema2Filter");
  const entePublicoCheckbox = document.getElementById("entePublicoFilter");

  const visualization = new d3plus.Treemap()
    .data(transformedData)
    .groupBy(["empresa", "id"])
    .sum("value")
    .shapeConfig({
      label: (d) => {
        if (d.children && d.children.length > 0) {
          return `${d.empresa}\nParticipaciones: ${d.value.toLocaleString()}`;
        } else {
          let label = d.tenderTitle || "";
          if (d.isSupplier) {
            label = "★ " + label;
          }
          if (d.hasEntePublicoMatch) {
            label = "✓ " + label;
          }
          if (d.hasSistema2) label = "⚑ " + label;
          return label;
        }
      },
    })
    .select("#chart")
    .label(function (d) {
      if (d.children && d.children.length > 0) {
        return d.empresa;
      } else {
        let label = d.tenderTitle || "";
        if (d.hasSistema2) {
          label = "★ " + label;
        }
        if (d.hasEntePublicoMatch) {
          label = "✓ " + label;
        }
        return label;
      }
    })
    .sum("value")
    .tile("squarify")
    .tooltipConfig({
      tbody: function (d) {
        let rows = [];
        if (d.children && d.children.length > 0) {
          rows.push(["Participaciones", d.value.toLocaleString()]);
          rows.push(["RFC", d.rfc || "No disponible"]);
        } else {
          rows.push([
            "Comprador",
            d.buyer ? d.buyer.name || "No disponible" : "No disponible",
          ]);
          if (d.tender) {
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
      if (d.children) {
        currentData = transformedData;
        backButton.style.display = "block";
        visualization.config({ data: d.children }).render();
      } else {
        backButton.style.display = "none";
        visualization.config({ data: transformedData }).render();
      }

      updateParticipacionesDetails(d);
    })
    .render();

  backButton.addEventListener("click", function () {
    if (currentData) {
      visualization.config({ data: currentData }).render();
      backButton.style.display = "none";
      document.getElementById("detalleParticipaciones").innerHTML = "";
    }
  });

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
    document.getElementById("detalleParticipaciones").innerHTML = "";
  }

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
    var ul = document.createElement("ul");
    participaciones.forEach(function (participacion) {
      var li = document.createElement("li");
      li.innerHTML = `
        <strong>Nombre:</strong> ${participacion.nombre || "No disponible"} ${
        participacion.primerApellido || ""
      } ${participacion.segundoApellido || ""}<br>
        <strong>Porcentaje de participación:</strong> ${
          participacion.porcentajeParticipacion !== undefined
            ? participacion.porcentajeParticipacion + "%"
            : "No disponible"
        }<br>
        <strong>Recibe remuneración:</strong> ${
          participacion.recibeRemuneracion !== undefined
            ? participacion.recibeRemuneracion
              ? "Sí"
              : "No"
            : "No disponible"
        }<br>
        <strong>Tipo de participación:</strong> ${
          participacion.tipoParticipacion || "No disponible"
        }<br>
        <strong>Sector de participación:</strong> ${
          participacion.sectorParticipacion || "No disponible"
        }<br>
        <strong>Cargo:</strong> ${
          participacion.empleoCargoComision || "No disponible"
        }<br>
        <strong>Ente público:</strong> ${
          participacion.nombreEntePublico || "No disponible"
        }<br>
        <strong>Fecha de posesión:</strong> ${
          participacion.fechaTomaPosesion || "No disponible"
        }<br>
        <strong>Contratado por honorarios:</strong> ${
          participacion.contratadoPorHonorarios !== undefined
            ? participacion.contratadoPorHonorarios
              ? "Sí"
              : "No"
            : "No disponible"
        }<br>
        <strong>Sistema 2:</strong> ${participacion.sistema2 ? "Sí" : "No"}
      `;
      ul.appendChild(li);
    });
    detalleDiv.appendChild(ul);
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
