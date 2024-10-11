let currentData = null;  // Variable para almacenar los datos actuales del treemap
// Cargar datos desde el archivo JSON
fetch('data/treemap.json')
    .then(response => response.json())
    .then(data => {
        // Transformar los datos para el treemap
        const transformedData = data.map((empresa, empresaIndex) => ({
            ...empresa,
            empresa: empresa.nombreEmpresa, // Primer nivel: Nombre de la empresa
            rfc: empresa.rfc,
            value: empresa.sistema6.length, // Tamaño basado en el número de elementos en sistema6_data
            children: empresa.sistema6.map((sistema6, sistemaIndex) => ({
                ...sistema6,
                id: sistemaIndex, // ID único basado en el índice
                tenderTitle: sistema6.tender.title, // Usamos el título para los datos internos
                value: 1, // Valor fijo para cada licitación
                isSupplier: sistema6.partiesMatch.isSupplier
            }))
        }));
        console.log(transformedData)
        const backButton = document.getElementById('backButton');
        // Crear el gráfico de treemap con drill down
        const visualization = new d3plus.Treemap()
            .data(transformedData)
            .groupBy(["empresa", "id"]) // Grupo por empresa y un ID único para no agrupar licitaciones
            .sum("value") // Determina el tamaño de cada bloque
            .shapeConfig({
                labelConfig: {
                    // Cambiar el texto mostrado en los cuadros
                    text: function (d) {
                        // Mostrar el nombre de la empresa en el primer nivel, o el título de la licitación en los niveles más bajos
                        let label = d["children"] && d["children"].length > 0
                            ? d["empresa"] + "\nParticipaciones: " + d["value"]
                            : d["tenderTitle"];

                        // Si es 'supplier', añadir la estrellita (★) al inicio
                        if (d.isSupplier) {
                            label = "★\n" + label; // Colocar la estrella al inicio
                        }
                        return label;
                    }
                }
            })
            .select("#chart")
            .label(function (d) {
                // Mostrar nombre de la empresa en el primer nivel, y el título de la licitación en los siguientes niveles
                return d["tenderTitle"] ? d["tenderTitle"] : d["empresa"];

            })
            .tooltipConfig({
                title: function (d) {
                    return d["tenderTitle"] ? d["tenderTitle"] : d["empresa"] || "Empresa no disponible"; // Título principal: nombre de la empresa
                },
                tbody: function (d) {
                    if (d["children"]) {
                        // Si hay children disponibles, mostramos información de la licitación
                        return [
                            ["Número de participaciones", d["value"] || "No disponible"],
                            ["RFC", d["rfc"] || "No disponible"],
                        ];
                    } else {
                        // Si no hay children, mostramos solo el nombre de la empresa
                        const tender = d.tender || {}; // Tomamos el objeto tender
                        return [
                            /* ["Monto", tender.value.amount || "No disponible"], */
                            ["Comprador", d.buyer ? d.buyer.name || "No disponible" : "No disponible"],
                            ["Título de Licitación", d.tenderTitle || "No disponible"],
                            /* ["Descripción de la Licitación", tender.description || "No disponible"], */
                            ["Fecha de Inicio de la Licitación", tender.tenderPeriod ? tender.tenderPeriod.startDate || "No disponible" : "No disponible"],
                            ["Fecha de Finalización de la Licitación", tender.awardPeriod ? tender.awardPeriod.endDate || "No disponible" : "No disponible"],
                            ["Método de Adquisición", tender.procurementMethod || "No disponible"],
                            ["Comprador", tender.procuringEntity ? tender.procuringEntity.name || "No disponible" : "No disponible"],
                            ["Estado del Proceso", tender.status || "No disponible"],
                        ];
                    }
                }
            })
            .on("click", function (d) {
                //console.log(d.children.length)
                // Verificar si tiene hijos
                if (d.children) {
                    currentData = transformedData; // Guardar la referencia del nivel padre
                    backButton.style.display = 'block'; // Mostrar el botón de regreso
                    // Mostrar el siguiente nivel
                    visualization.config({ data: d.children }).render();

                } else {
                    // Volver al nivel superior
                    backButton.style.display = 'none';
                    visualization.config({ data: transformedData }).render();
                }
                var detalleDiv = document.getElementById("detalleParticipaciones");

                // Limpiar el contenido anterior del div
                detalleDiv.innerHTML = "";

                // Verificar si hay participaciones en el nodo
                if (d.participaciones) {
                    // Si es un objeto, convertirlo en un arreglo
                    let participaciones = Array.isArray(d.participaciones) ? d.participaciones : [d.participaciones];
                    // Crear una lista no ordenada
                    var ul = document.createElement("div");
                    // Agregar los elementos de la lista con los datos de cada participación
                    participaciones.forEach(function (participacion) {
                        // Validar cada valor y asignar "No disponible" si es undefined
                        var nombre = participacion.nombre || "No disponible";
                        var primerApellido = participacion.primerApellido || "No disponible";
                        var segundoApellido = participacion.segundoApellido || "No disponible";
                        var porcentajeParticipacion = participacion.porcentajeParticipacion !== undefined ? participacion.porcentajeParticipacion : "No disponible";
                        var recibeRemuneracion = participacion.recibeRemuneracion !== undefined ? (participacion.recibeRemuneracion ? 'Sí' : 'No') : "No disponible";
                        var tipoParticipacion = participacion.tipoParticipacion || "No disponible";
                        var sectorParticipacion = participacion.sectorParticipacion || "No disponible";
                        var empleoCargoComision = participacion.empleoCargoComision || "No disponible";
                        var ente = participacion.nombreEntePublico || "No disponible";
                        var fechaTomaPosesion = participacion.fechaTomaPosesion || "No disponible";
                        var honorarios = participacion.contratadoPorHonorarios !== undefined ? (participacion.contratadoPorHonorarios ? 'Sí' : 'No') : "No disponible";

                        // Crear el elemento <li> principal
                        var li = document.createElement("div");

                        // Crear una lista anidada para los detalles
                        var ulDetalles = document.createElement("ul");

                        // Función para crear elementos de lista
                        function crearElementoLista(texto) {
                            var li = document.createElement("li");
                            li.innerHTML = texto;
                            return li;
                        }

                        // Agregar detalles a la lista anidada
                        ulDetalles.appendChild(crearElementoLista(`Nombre: ${nombre} ${primerApellido} ${segundoApellido}`));
                        ulDetalles.appendChild(crearElementoLista(`Porcentaje de participación: ${porcentajeParticipacion}%`));
                        ulDetalles.appendChild(crearElementoLista(`Remuneración en la participación: ${recibeRemuneracion}`));
                        ulDetalles.appendChild(crearElementoLista(`Tipo de participación: ${tipoParticipacion}`));
                        ulDetalles.appendChild(crearElementoLista(`Cargo: ${empleoCargoComision}`));
                        ulDetalles.appendChild(crearElementoLista(`Ente público: ${ente}`));
                        ulDetalles.appendChild(crearElementoLista(`Fecha de posesión: ${fechaTomaPosesion}`));
                        ulDetalles.appendChild(crearElementoLista(`Contratado por honorarios: ${honorarios}`));

                        // Si existe información del sistema2, agregarla con un color distintivo
                        if (participacion.sistema2) {
                            const s2 = participacion.sistema2;
                            var liSistema2 = crearElementoLista('<span style="color: #4a90e2;">Información del Sistema 2:</span>');
                            var ulSistema2 = document.createElement("ul");

                            ulSistema2.appendChild(crearElementoLista(`<span style="color: #4a90e2;">ID: ${s2.id || "No disponible"}</span>`));
                            ulSistema2.appendChild(crearElementoLista(`<span style="color: #4a90e2;">Nombres: ${s2.nombres || "No disponible"}</span>`));
                            ulSistema2.appendChild(crearElementoLista(`<span style="color: #4a90e2;">Primer Apellido: ${s2.primerApellido || "No disponible"}</span>`));
                            ulSistema2.appendChild(crearElementoLista(`<span style="color: #4a90e2;">Segundo Apellido: ${s2.segundoApellido || "No disponible"}</span>`));
                            ulSistema2.appendChild(crearElementoLista(`<span style="color: #4a90e2;">Institución: ${s2.institucionDependencia?.nombre || "No disponible"}</span>`));
                            ulSistema2.appendChild(crearElementoLista(`<span style="color: #4a90e2;">Puesto: ${s2.puesto?.nombre || "No disponible"}</span>`));
                            ulSistema2.appendChild(crearElementoLista(`<span style="color: #4a90e2;">Nivel: ${s2.puesto?.nivel || "No disponible"}</span>`));
                            ulSistema2.appendChild(crearElementoLista(`<span style="color: #4a90e2;">Nivel de Responsabilidad: ${s2.nivelResponsabilidad?.map(nr => nr.valor).join(", ") || "No disponible"}</span>`));
                            ulSistema2.appendChild(crearElementoLista(`<span style="color: #4a90e2;">Tipo de Procedimiento: ${s2.tipoProcedimiento?.map(tp => tp.valor).join(", ") || "No disponible"}</span>`));

                            liSistema2.appendChild(ulSistema2);
                            ulDetalles.appendChild(liSistema2);
                        }

                        // Agregar la lista de detalles al elemento principal
                        li.appendChild(ulDetalles);

                        // Agregar el elemento principal a la lista
                        ul.appendChild(li);
                    });
                    // Agregar la lista al div
                    detalleDiv.appendChild(ul);

                }
            })
            .render();
        // Añadir funcionalidad al botón de regreso
        backButton.addEventListener('click', function () {
            console.log(currentData)
            if (currentData) {
                // Volver al nivel padre
                visualization.config({ data: currentData }).render();
                backButton.style.display = 'none';  // Ocultar el botón de regreso
                document.getElementById("detalleParticipaciones").innerHTML = ""; // Limpiar la sección de detalles
            }
        });
    })
    .catch(error => console.error('Error al cargar los datos:', error));
