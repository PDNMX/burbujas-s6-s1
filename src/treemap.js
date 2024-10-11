let currentData = null;
let allData = null;  // Variable para almacenar todos los datos originales

// Función para transformar los datos
function processData(data) {
    return data.map((empresa, empresaIndex) => ({
        ...empresa,
        empresa: empresa.nombreEmpresa,
        rfc: empresa.rfc,
        value: empresa.sistema6.length,
        children: empresa.sistema6.map((sistema6, sistemaIndex) => ({
            ...sistema6,
            id: sistemaIndex,
            tenderTitle: sistema6.tender.title,
            value: 1,
            isSupplier: sistema6.partiesMatch.isSupplier
        }))
    }));
}

// Función para filtrar los datos
function filterData(data, onlySuppliers) {
    if (!onlySuppliers) return data;
    
    return data.map(empresa => ({
        ...empresa,
        children: empresa.children.filter(child => child.isSupplier),
        value: empresa.children.filter(child => child.isSupplier).length
    })).filter(empresa => empresa.value > 0);
}

// Las funciones processData y filterData permanecen sin cambios

function renderTreemap(transformedData) {
    const backButton = document.getElementById('backButton');
    const supplierCheckbox = document.getElementById('supplierFilter');
    
    const visualization = new d3plus.Treemap()
        .data(transformedData)
        .groupBy(["empresa", "id"])
        .sum("value")
        .shapeConfig({
            labelConfig: {
                text: function (d) {
                    let label = d["children"] && d["children"].length > 0
                        ? d["empresa"] + "\nParticipaciones: " + d["value"]
                        : d["tenderTitle"];
                    if (d.isSupplier) {
                        label = "★\n" + label;
                    }
                    return label;
                }
            }
        })
        .select("#chart")
        .label(function (d) {
            return d["tenderTitle"] ? d["tenderTitle"] : d["empresa"];
        })
        .tooltipConfig({
            // El contenido del tooltipConfig permanece sin cambios
        })
        .on("click", function (d) {
            if (d.children) {
                currentData = transformedData;
                backButton.style.display = 'block';
                visualization.config({ data: d.children }).render();
            } else {
                backButton.style.display = 'none';
                visualization.config({ data: transformedData }).render();
            }

            // Actualizar el div de detalles de participaciones
            updateParticipacionesDetails(d);
        })
        .render();

    backButton.addEventListener('click', function () {
        if (currentData) {
            visualization.config({ data: currentData }).render();
            backButton.style.display = 'none';
            document.getElementById("detalleParticipaciones").innerHTML = "";
        }
    });

    supplierCheckbox.addEventListener('change', function() {
        const filteredData = filterData(allData, this.checked);
        currentData = filteredData;
        visualization.config({ data: filteredData }).render();
        backButton.style.display = 'none';
        document.getElementById("detalleParticipaciones").innerHTML = "";
    });
}

// Nueva función para actualizar los detalles de participaciones
function updateParticipacionesDetails(d) {
    var detalleDiv = document.getElementById("detalleParticipaciones");
    detalleDiv.innerHTML = "";

    if (d.participaciones) {
        let participaciones = Array.isArray(d.participaciones) ? d.participaciones : [d.participaciones];
        var ul = document.createElement("ul");
        participaciones.forEach(function (participacion) {
            var li = document.createElement("li");
            li.innerHTML = `
                <strong>Nombre:</strong> ${participacion.nombre || 'No disponible'} ${participacion.primerApellido || ''} ${participacion.segundoApellido || ''}<br>
                <strong>Porcentaje de participación:</strong> ${participacion.porcentajeParticipacion !== undefined ? participacion.porcentajeParticipacion + '%' : 'No disponible'}<br>
                <strong>Recibe remuneración:</strong> ${participacion.recibeRemuneracion !== undefined ? (participacion.recibeRemuneracion ? 'Sí' : 'No') : 'No disponible'}<br>
                <strong>Tipo de participación:</strong> ${participacion.tipoParticipacion || 'No disponible'}<br>
                <strong>Sector de participación:</strong> ${participacion.sectorParticipacion || 'No disponible'}<br>
                <strong>Cargo:</strong> ${participacion.empleoCargoComision || 'No disponible'}<br>
                <strong>Ente público:</strong> ${participacion.nombreEntePublico || 'No disponible'}<br>
                <strong>Fecha de posesión:</strong> ${participacion.fechaTomaPosesion || 'No disponible'}<br>
                <strong>Contratado por honorarios:</strong> ${participacion.contratadoPorHonorarios !== undefined ? (participacion.contratadoPorHonorarios ? 'Sí' : 'No') : 'No disponible'}
            `;
            ul.appendChild(li);
        });
        detalleDiv.appendChild(ul);
    } else {
        detalleDiv.innerHTML = "<p>No hay detalles de participaciones disponibles.</p>";
    }
}

// Uso de la función
fetch('data/treemap.json')
    .then(response => response.json())
    .then(data => {
        allData = processData(data);
        renderTreemap(allData);
    })
    .catch(error => console.error('Error al cargar los datos:', error));
