let currentData = null;
let allData = null;
let currentEmpresa = '';
let visualization = null;

const childColors = {
  // Color base para licitaciones normales - un gris suave que combina con #5f5e6d
  default: '#f1eff1',

  // Color para licitaciones adjudicadas - un tono suave del color principal #94638d
  withSupplier: ' hsl(44, 96%, 78%)',

  // Color para coincidencias entre ente público - un tono más intenso
  withEqualEnte: 'hsl(27, 73%, 65%)',

  // Color para coincidencias en Sistema 2 - el más intenso para máxima atención
  withSistema2: 'hsl(347, 48%, 49%)',
};

// Función principal para manejar la exportación
async function handleExportAll() {
  const exportAllBtn = document.getElementById('exportAllButton');
  if (!exportAllBtn) return;

  const progressBar = createProgressBar();
  const worker = createWorker();

  try {
    exportAllBtn.disabled = true;
    const originalHTML = exportAllBtn.innerHTML;
    exportAllBtn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i>Procesando...';

    worker.onmessage = function(e) {
      if (e.data.type === 'progress') {
        updateProgressBar(progressBar, e.data.progress);
      } else if (e.data.type === 'complete') {
        downloadZipFile(e.data.data);
        resetExportButton(exportAllBtn, originalHTML);
        removeProgressBar(progressBar);
        worker.terminate(); // Limpiar el worker
      }
    };

    worker.onerror = function(error) {
      console.error('Worker error:', error);
      alert('Hubo un error al procesar los archivos.');
      resetExportButton(exportAllBtn, originalHTML);
      removeProgressBar(progressBar);
      worker.terminate();
    };

    // Iniciar el procesamiento
    worker.postMessage({
      empresas: allData,
      batchSize: 5
    });

  } catch (error) {
    console.error('Error:', error);
    alert('Hubo un error al iniciar la exportación.');
    resetExportButton(exportAllBtn, originalHTML);
    removeProgressBar(progressBar);
    if (worker) worker.terminate();
  }
}

// Funciones auxiliares
function createProgressBar() {
  const container = document.createElement('div');
  container.className = 'progress mt-2';
  container.style.height = '5px';

  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated';
  progressBar.style.width = '0%';

  container.appendChild(progressBar);

  // Insertar después del botón exportAllButton
  const exportAllBtn = document.getElementById('exportAllButton');
  exportAllBtn.parentNode.insertBefore(container, exportAllBtn.nextSibling);

  return container;
}

function updateProgressBar(container, progress) {
  const progressBar = container.querySelector('.progress-bar');
  progressBar.style.width = `${progress}%`;
}

function removeProgressBar(container) {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
}

function resetExportButton(button, originalHTML) {
  button.disabled = false;
  button.innerHTML = originalHTML;
}

function downloadZipFile(zipContent) {
  const blob = new Blob([zipContent], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PDN_Treemap_Empresas_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Agregar el evento al botón cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  const exportAllBtn = document.getElementById('exportAllButton');
  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', handleExportAll);
  }
});

// Función auxiliar para normalizar texto (eliminar acentos)
function normalizeText(text) {
  return text
    ? text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    : '';
}

function exportToExcel(empresa) {
  // Asegurarnos que participaciones sea un arreglo
  let participaciones = [];
  if (empresa.participaciones) {
    participaciones = Array.isArray(empresa.participaciones) ? empresa.participaciones : [empresa.participaciones];

    // Filtrar participaciones duplicadas (como en updateParticipacionesDetails)
    const uniqueSet = new Set();
    participaciones = participaciones.filter(participacion => {
      const fullName = `${participacion.nombre || ''} ${participacion.primerApellido || ''} ${
        participacion.segundoApellido || ''
      }`.trim();
      const ente = participacion.nombreEntePublico || 'Ente no disponible';
      const key = `${fullName}|${ente}`;
      if (uniqueSet.has(key)) {
        return false;
      }
      uniqueSet.add(key);
      return true;
    });
  }

  // Preparar los datos para la hoja de participaciones
  const participacionesData = participaciones.map(p => ({
    Nombre: `${p.nombre || ''} ${p.primerApellido || ''} ${p.segundoApellido || ''}`.trim() || 'No disponible',
    'Ente Público': p.nombreEntePublico || 'No disponible',
    Cargo: p.empleoCargoComision || 'No disponible',
    'Fecha de Posesión': p.fechaTomaPosesion || 'No disponible',
    'Contratado por Honorarios': p.contratadoPorHonorarios ? 'Sí' : 'No',
    'Área de Adscripción': p.areaAdscripcion || 'No disponible',
    'Porcentaje de Participación': p.porcentajeParticipacion || 'No disponible',
    'Recibe Remuneración': p.recibeRemuneracion ? 'Sí' : 'No',
    'Tipo de Participación': p.tipoParticipacion || 'No disponible',
    'Sector de Participación': p.sectorParticipacion || 'No disponible',
    // Información del Sistema 2 si existe
    /* 'S2 - Nombres': p.sistema2?.nombres || 'No disponible',
    'S2 - Primer Apellido': p.sistema2?.primerApellido || 'No disponible',
    'S2 - Segundo Apellido': p.sistema2?.segundoApellido || 'No disponible',
    'S2 - Institución': p.sistema2?.institucionDependencia?.nombre || 'No disponible',
    'S2 - Puesto': p.sistema2?.puesto?.nombre || 'No disponible',
    'S2 - Nivel': p.sistema2?.puesto?.nivel || 'No disponible',
    'S2 - Nivel de Responsabilidad':
      p.sistema2?.nivelResponsabilidad?.map(nr => nr.valor).join(', ') || 'No disponible',
    'S2 - Tipo de Procedimiento': p.sistema2?.tipoProcedimiento?.map(tp => tp.valor).join(', ') || 'No disponible', */
  }));

  // Asegurarnos que children sea un arreglo
  const children = Array.isArray(empresa.children) ? empresa.children : [];

  // Preparar los datos para la hoja de procesos de contratación
  const contratacionesData = children.map(child => ({
    'Título del proceso de contratación': child.tender?.title || 'No disponible',
    'Fecha de inicio de recepción de ofertas': child.tender?.tenderPeriod?.startDate || 'No disponible',
    '>Fecha de adjudicación': child.tender?.awardPeriod?.endDate || 'No disponible',
    'Método de Contratación': child.tender?.procurementMethod || 'No disponible',
    'Entidad contratante': child.buyer?.name || 'No disponible',
    'Estatus del proceso de contratación': child.tender?.status || 'No disponible',
    'Es Proveedor': child.partiesMatch?.isSupplier ? 'Sí' : 'No',
    'Coincidencia Ente Público': child.hasEntePublicoMatch ? 'Sí' : 'No',
    'Coincidencia Sistema 2': child.hasSistema2 ? 'Sí' : 'No',
    'Buyer': child.buyerAndProcuringEntities?.buyer?.name || 'No disponible',
    'Procuring Entity': child.buyerAndProcuringEntities?.procuringEntity?.name || 'No disponible',
    'Monto Adjudicado': child.awards?.[0]?.value?.amount || 'No disponible',
    'Moneda': child.awards?.[0]?.value?.currency || 'No disponible',
  }));

  // Crear el libro de trabajo
  const wb = XLSX.utils.book_new();

  // Verificar si hay datos para cada hoja
  if (participacionesData.length > 0) {
    const ws1 = XLSX.utils.json_to_sheet(participacionesData);
    const wscols1 = Object.keys(participacionesData[0]).map(() => ({ wch: 20 }));
    ws1['!cols'] = wscols1;
    XLSX.utils.book_append_sheet(wb, ws1, 'Participaciones');
  } else {
    // Crear una hoja vacía con mensaje
    const ws1 = XLSX.utils.aoa_to_sheet([['No hay datos de participaciones disponibles']]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Participaciones');
  }

  if (contratacionesData.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(contratacionesData);
    const wscols2 = Object.keys(contratacionesData[0]).map(() => ({ wch: 20 }));
    ws2['!cols'] = wscols2;
    XLSX.utils.book_append_sheet(wb, ws2, 'Procesos de Contratación');
  } else {
    // Crear una hoja vacía con mensaje
    const ws2 = XLSX.utils.aoa_to_sheet([['No hay datos de procesos de contratación disponibles']]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Procesos de Contratación');
  }

  // Generar el archivo y descargarlo
  const fileName = `PDN_${empresa.nombreEmpresa || 'Empresa'}_${empresa.rfc || 'RFC'}_${
    new Date().toISOString().split('T')[0]
  }.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// Función para transformar los datos
function processData(data) {
  return data.map(empresa => ({
    ...empresa,
    empresa: empresa.nombreEmpresa,
    rfc: empresa.rfc,
    value: empresa.sistema6.length,
    hasHighParticipation: empresa.participaciones.some(participacion => participacion.porcentajeParticipacion >= 50),
    children: empresa.sistema6.map((sistema6, sistemaIndex) => ({
      ...sistema6,
      id: sistemaIndex,
      tenderTitle: sistema6.tender.title,
      value: 1,
      hasSistema2: empresa.participaciones.some(
        p =>
          p.sistema2 &&
          p.sistema2.institucionDependencia &&
          p.sistema2.institucionDependencia.nombre &&
          sistema6.buyer &&
          sistema6.buyer.name &&
          p.sistema2.institucionDependencia.nombre.toLowerCase() === sistema6.buyer.name.toLowerCase(),
      ),
      hasEntePublicoMatch: empresa.participaciones.some(
        p =>
          p.nombreEntePublico &&
          sistema6.buyer &&
          sistema6.buyer.name &&
          p.nombreEntePublico.toLowerCase() === sistema6.buyer.name.toLowerCase(),
      ),
      isSupplier: sistema6.partiesMatch.isSupplier,
      hasBuyerProcuringMatch:
        sistema6.buyerAndProcuringEntities &&
        sistema6.buyerAndProcuringEntities.buyer &&
        sistema6.buyerAndProcuringEntities.buyer.name &&
        sistema6.buyerAndProcuringEntities.procuringEntity &&
        sistema6.buyerAndProcuringEntities.procuringEntity.name &&
        sistema6.buyerAndProcuringEntities.buyer.name.toLowerCase() ===
          sistema6.buyerAndProcuringEntities.procuringEntity.name.toLowerCase() &&
        sistema6.buyer &&
        sistema6.buyer.name &&
        empresa.participaciones.some(p => {
          // Construir nombreCompleto de la participación
          const nombreCompleto = `${p.nombre || ''} ${p.primerApellido || ''} ${p.segundoApellido || ''}`
            .trim()
            .toLowerCase();
          // Verificar coincidencia con nombreEntePublico
          const matchesEntePublico =
            p.nombreEntePublico && p.nombreEntePublico.toLowerCase() === sistema6.buyer.name.toLowerCase();
          // Verificar coincidencia con nombreCompleto para buyer y procuringEntity
          const matchesNombreCompleto =
            nombreCompleto &&
            (sistema6.buyerAndProcuringEntities.buyer.name.toLowerCase().includes(nombreCompleto) ||
              sistema6.buyerAndProcuringEntities.procuringEntity.name.toLowerCase().includes(nombreCompleto));

          return matchesEntePublico && matchesNombreCompleto;
        }),
    })),
  }));
}

// Función para filtrar los datos
function filterData(
  data,
  onlySistema2,
  onlyEntePublicoMatch,
  onlySupplier,
  onlyBuyerProcuringMatch,
  onlyHighParticipation,
  searchTerm = '',
) {
  currentEmpresa = '';
  return data
    .map(empresa => {
      // Normalizar el término de búsqueda una sola vez
      const normalizedSearchTerm = normalizeText(searchTerm);

      // Buscar en nombreEmpresa y RFC (normalizados)
      const matchesEmpresa = normalizeText(empresa.nombreEmpresa).includes(normalizedSearchTerm);
      const matchesRFC = normalizeText(empresa.rfc).includes(normalizedSearchTerm);

      // Buscar en participaciones (nombreCompleto normalizado)
      const matchesParticipante = empresa.participaciones.some(participacion => {
        const nombreCompleto = `${participacion.nombre || ''} ${participacion.primerApellido || ''} ${
          participacion.segundoApellido || ''
        }`.trim();
        return normalizeText(nombreCompleto).includes(normalizedSearchTerm);
      });

      // Verificar si hay participaciones mayores al 50%
      const hasHighParticipation = empresa.participaciones.some(
        participacion => participacion.porcentajeParticipacion >= 50,
      );

      // Si hay término de búsqueda y no hay coincidencias, retornar null
      if (searchTerm && !matchesEmpresa && !matchesRFC && !matchesParticipante) {
        return null;
      }

      // Si se requiere alta participación y no la tiene, retornar null
      if (onlyHighParticipation && !hasHighParticipation) {
        return null;
      }

      const filteredChildren = empresa.children.filter(child => {
        if (onlySistema2 && !child.hasSistema2) return false;
        if (onlyEntePublicoMatch && !child.hasEntePublicoMatch) return false;
        if (onlySupplier && !child.isSupplier) return false;
        if (onlyBuyerProcuringMatch && !child.hasBuyerProcuringMatch) return false;
        return true;
      });

      return {
        ...empresa,
        children: filteredChildren,
        value: filteredChildren.length,
      };
    })
    .filter(empresa => empresa && empresa.children.length > 0);
}

function renderTreemap(transformedData) {
  const backButton = document.getElementById('backButton');
  const leyendaColores = document.getElementById('leyendaColores');
  const supplierCheckbox = document.getElementById('supplierFilter');
  const sistema2Checkbox = document.getElementById('sistema2Filter');
  const entePublicoCheckbox = document.getElementById('entePublicoFilter');
  const buyerProcuringCheckbox = document.getElementById('buyerProcuringFilter'); // Nuevo checkbox
  const cardDetalleParticipaciones = document.getElementById('cardDetalleParticipaciones');
  const highParticipationCheckbox = document.getElementById('highParticipationFilter');
  const searchInput = document.getElementById('searchInput');
  const loadingSpinner = document.getElementById('loadingSpinner');
  // Función debounce para optimizar la búsqueda
  const debouncedApplyFilters = _.debounce(applyFilters, 300);

  function applyFilters() {
    loadingSpinner.style.display = 'inline-block';

    setTimeout(() => {
      const filteredData = filterData(
        allData,
        sistema2Checkbox.checked,
        entePublicoCheckbox.checked,
        supplierCheckbox.checked,
        buyerProcuringCheckbox.checked,
        highParticipationCheckbox.checked, // Nuevo checkbox
        searchInput.value,
      );

      currentData = filteredData;
      console.log(currentData);

      visualization.config({ data: filteredData }).render();
      backButton.style.display = 'none';
      leyendaColores.style.display = 'none';
      cardDetalleParticipaciones.style.display = 'none';
      document.getElementById('detalleParticipaciones').innerHTML = '';
      document.getElementById('exportButton').classList.add('d-none');

      loadingSpinner.style.display = 'none';
    }, 0);
  }

  const visualization = new d3plus.Treemap()
    .data(transformedData)
    .groupBy(['empresa', 'id'])
    .sum('value')
    .shapeConfig({
      /* fill: d => d.empresa === "IPN" ? "green" : "orange", */
      label: d => {
        if (d.children /* && d.children.length > 0 */) {
          return `${d.hasHighParticipation ? '▲\n' : ''}${
            d.empresa
          }\n<b>Procesos de \nContratación:</b> ${d.value.toLocaleString()}\n<b>RFC:</b> ${d.rfc}`;
        } else {
          let label = d.buyer ? d.buyer.name || 'No disponible' : 'No disponible';

          if (d.isSupplier) {
            label = '★ ' + label;
          }
          if (d.hasEntePublicoMatch) {
            label = '⚑  ' + label;
          }
          if (d.hasSistema2) label = '✓ ' + label;
          return label;
        }
      },
    })
    .select('#chart')
    // label en title del tooltip
    .label(function (d) {
      if (d.children /* && d.children.length > 0 */) {
        return d.empresa;
      } else {
        //console.log(d)
        let label = d.buyer ? d.buyer.name || 'No disponible' : 'No disponible';
        return label;
      }
    })
    .sum('value')
    .tile('squarify')
    .color(d => {
      if (d.children) {
        // Colores en tonos azules según el valor de d.value
        if (d.value < 10) {
          return '#68B4D2'; // Azul muy claro
        } else if (d.value < 50) {
          return '#7FB6E8'; // Azul claro
        } else if (d.value < 100) {
          return '#B39CD8'; // Azul intermedio
        } else if (d.value < 500) {
          return '#D5A7E5'; // Azul más oscuro
        } else {
          return '#A88A9B'; // Azul muy oscuro
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

    </div>`;
    })
    .loadingMessage(true)
    .loadingHTML(() => {
      return `<div style="left: 50%; top: 50%; position: absolute; transform: translate(-50%, -50%);">
        <i class="fa fa-exclamation-triangle fa-3x text-muted mb-3"></i>
        <h4 class="mb-3">Cargando información...</h4>
    </div>`;
    })
    .legend(false)
    .tooltipConfig({
      background: 'white',
      fontSize: '12px',
      padding: '12px',
      tbody: function (d) {
        let rows = [];
        if (d.children) {
          rows.push([
            "<strong style='color: #5f5e6d; float: left; margin-right: 5px;'>Procesos de Contratación:</strong>",
            `<span style='color: #94638d; float: left;'>${d.value.toLocaleString()}</span>`,
          ]);
          rows.push([
            "<strong style='color: #5f5e6d; float: left; '>RFC:</strong>",
            `<span style='color: #bc798d; float: left;'>${d.rfc || 'No disponible'}</span>`,
          ]);
        } else if (d.tender) {
          // Información existente del tender
          rows = [
            [
              "<strong style='color: #5f5e6d; float: left; margin-right: 5px;'>Título del proceso de contratación:</strong>",
              `<span style='color: #94638d; float: left;'>${d.tenderTitle || 'No disponible'}</span>`,
            ],
            [
              "<strong style='color: #5f5e6d; float: left; margin-right: 5px;'>Fecha de inicio de recepción de ofertas:</strong>",
              `<span style='color: #bc798d; float: left;'>${
                d.tender.tenderPeriod ? d.tender.tenderPeriod.startDate || 'No disponible' : 'No disponible'
              }</span>`,
            ],
            [
              "<strong style='color: #5f5e6d; float: left; margin-right: 5px;'>Fecha de adjudicación:</strong>",
              `<span style='color: #bc798d; float: left;'>${
                d.tender.awardPeriod ? d.tender.awardPeriod.endDate || 'No disponible' : 'No disponible'
              }</span>`,
            ],
            [
              "<strong style='color: #5f5e6d; float: left; margin-right: 5px;'>Método de Contratación:</strong>",
              `<span style='color: #94638d; float: left;'>${
                d.tender.procurementMethod?.toLowerCase() === 'open'
                  ? 'Licitación'
                  : d.tender.procurementMethod?.toLowerCase() === 'direct'
                  ? 'Adjudicación directa'
                  : d.tender.procurementMethod?.toLowerCase() === 'selective'
                  ? 'Invitación a cuando menos 3'
                  : d.tender.procurementMethod || 'No disponible'
              }</span>`,
            ],
            [
              "<strong style='color: #5f5e6d; float: left; margin-right: 5px;'>Entidad contratante:</strong>",
              `<span style='color: #94638d; float: left;'>${
                d.tender.procuringEntity ? d.tender.procuringEntity.name || 'No disponible' : 'No disponible'
              }</span>`,
            ],
            [
              "<strong style='color: #5f5e6d; float: left; margin-right: 5px;'>Estatus del proceso de contratación:</strong>",
              `<span style='color: #bc798d; float: left;'>${d.tender.status || 'No disponible'}</span>`,
            ],
          ];

          // Agregar información de awards si existe
          if (d.awards && Array.isArray(d.awards)) {
            // Información de cada award
            d.awards.forEach((award, index) => {
              // Monto y moneda
              if (award.value) {
                rows.push([
                  `<strong style='color: #5f5e6d; float: left; margin-right: 5px;'>Monto adjudicado ${
                    index + 1
                  }:</strong>`,
                  `<span style='color: #94638d; float: left;'>${
                    award.value.amount?.toLocaleString() || 'No disponible'
                  } ${award.value.currency || ''}</span>`,
                ]);
              }

              // Status del award
              /* if (award.status) {
                rows.push([
                  `<strong style='color: #333; float: left; margin-right: 5px;'>Estado de adjudicación ${index + 1}:</strong>`,
                  `<span style='color: #fd7e14; float: left;'>${award.status}</span>`
                ]);
              }

              // Información de suppliers
              if (award.suppliers && Array.isArray(award.suppliers)) {
                award.suppliers.forEach((supplier, supplierIndex) => {
                  rows.push([
                    `<strong style='color: #333; float: left; margin-right: 5px;'>Proveedor ${index + 1}.${supplierIndex + 1}:</strong>`,
                    `<span style='color: #20c997; float: left;'>${supplier.name || "No disponible"} (ID: ${supplier.id || "No disponible"})</span>`
                  ]);
                });
              } */
            });
          }

          // Información de requestingUnits
          if (d.planning && Array.isArray(d.planning.requestingUnits)) {
            d.planning.requestingUnits.forEach((unit, index) => {
              rows.push([
                `<strong style='color: #5f5e6d; float: left; margin-right: 5px;'>${
                  index === 0 ? `Área Requirente (${index + 1}):` : ''
                }</strong>`,
                `<span style='color: #bc798d; float: left;'>${unit.name || 'No disponible'}</span>`,
              ]);
            });
          }

          // En la configuración del tooltip, dentro de la función tbody
          if (d.buyerAndProcuringEntities) {
            // Información del Buyer
            if (d.buyerAndProcuringEntities.buyer) {
              rows.push([
                "<strong style='color: #5f5e6d; float: left; margin-right: 5px;'>Comprador (buyer):</strong>",
                `<span style='color: #94638d; float: left;'>${
                  d.buyerAndProcuringEntities.buyer.name || 'No disponible'
                }</span>`,
              ]);
            }

            // Información del Procuring Entity
            if (d.buyerAndProcuringEntities.procuringEntity) {
              rows.push([
                "<strong style='color: #5f5e6d; float: left; margin-right: 5px;'>Entidad contratante (procuringEntity):</strong>",
                `<span style='color: #94638d; float: left;'>${
                  d.buyerAndProcuringEntities.procuringEntity.name || 'No disponible'
                }</span>`,
              ]);
            }
          }
        }
        return rows;
      },
      title: function (d) {
        return `<div style='
        width: 100%;
        font-size: 14px;
        font-weight: bold;
        color: #94638d;
        margin:0;
        margin-bottom: 10px;
        text-align: left;
        padding-bottom: 8px;
        border-bottom: 2px solid rgba(148, 99, 141, 0.8);
        '>
          ${d.children ? d.empresa || 'Empresa' : d.buyer ? d.buyer.name || 'Comprador' : 'Comprador'}
        </div>`;
      },
    })
    .on('click', function (d) {
      if (d.children /* && d.children.length > 0 */) {
        currentData = transformedData;
        currentEmpresa = d.empresa;

        // Mostrar los botones
        backButton.classList.remove('d-none');
        document.getElementById('exportButton').classList.remove('d-none');

        backButton.style.display = 'block';
        leyendaColores.style.display = 'block';
        cardDetalleParticipaciones.style.display = 'block';
        visualization.config({ data: d.children }).render();
        updateParticipacionesDetails(d);

        document.getElementById('exportButton').onclick = () => {
          try {
            const loadingIcon = document.getElementById('exportButton').querySelector('i');
            const originalClass = loadingIcon.className;

            // Cambiar el ícono a spinning mientras procesa
            loadingIcon.className = 'fa fa-spinner fa-spin me-2';
            document.getElementById('exportButton').disabled = true;

            exportToExcel(d);

            // Restaurar el ícono original
            setTimeout(() => {
              loadingIcon.className = originalClass;
              document.getElementById('exportButton').disabled = false;
            }, 1000);
          } catch (error) {
            console.error('Error al exportar:', error);
            alert('Hubo un error al exportar los datos. Por favor, inténtelo de nuevo.');

            // Restaurar el botón a su estado original
            const loadingIcon = document.getElementById('exportButton').querySelector('i');
            loadingIcon.className = 'fa fa-file-excel me-2';
            document.getElementById('exportButton').disabled = false;
          }
        };
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
    .titleConfig({
      ariaHidden: true,
      fontSize: 20,
      padding: 3,
      resize: true,
      textAnchor: 'middle',
      fill: 'red',
      color: 'red',
    })
    .render();

  backButton.addEventListener('click', function () {
    applyFilters();
  });
  function initializeClearFilters() {
    // Crear el botón si no existe en el HTML
    let clearFiltersBtn = document.getElementById('clearFiltersBtn');

    function clearAllFilters() {
      const searchInput = document.getElementById('searchInput');
      const supplierCheckbox = document.getElementById('supplierFilter');
      const sistema2Checkbox = document.getElementById('sistema2Filter');
      const entePublicoCheckbox = document.getElementById('entePublicoFilter');
      const buyerProcuringCheckbox = document.getElementById('buyerProcuringFilter');
      const highParticipationCheckbox = document.getElementById('highParticipationFilter');

      // Limpiar todos los filtros
      searchInput.value = '';
      supplierCheckbox.checked = false;
      sistema2Checkbox.checked = false;
      entePublicoCheckbox.checked = false;
      buyerProcuringCheckbox.checked = false;
      highParticipationCheckbox.checked = false;

      // Ocultar spinner de búsqueda si está visible
      const loadingSpinner = document.getElementById('loadingSpinner');
      if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
      }

      // Restablecer estado global
      currentEmpresa = '';

      // Aplicar los filtros
      if (typeof applyFilters === 'function') {
        applyFilters();
      }

      updateClearFiltersVisibility();
    }

    function updateClearFiltersVisibility() {
      const searchInput = document.getElementById('searchInput');
      const supplierCheckbox = document.getElementById('supplierFilter');
      const sistema2Checkbox = document.getElementById('sistema2Filter');
      const entePublicoCheckbox = document.getElementById('entePublicoFilter');
      const buyerProcuringCheckbox = document.getElementById('buyerProcuringFilter');
      const highParticipationCheckbox = document.getElementById('highParticipationFilter');

      const hasActiveFilters =
        searchInput.value !== '' ||
        supplierCheckbox.checked ||
        sistema2Checkbox.checked ||
        entePublicoCheckbox.checked ||
        buyerProcuringCheckbox.checked ||
        highParticipationCheckbox.checked;

      clearFiltersBtn.style.opacity = hasActiveFilters ? '1' : '0.5';
      clearFiltersBtn.disabled = !hasActiveFilters;
    }

    const inputs = [
      document.getElementById('searchInput'),
      document.getElementById('supplierFilter'),
      document.getElementById('sistema2Filter'),
      document.getElementById('entePublicoFilter'),
      document.getElementById('buyerProcuringFilter'),
      document.getElementById('highParticipationFilter'),
    ];

    inputs.forEach(input => {
      if (input) {
        input.addEventListener(input.type === 'text' ? 'input' : 'change', updateClearFiltersVisibility);
      }
    });

    clearFiltersBtn.addEventListener('click', clearAllFilters);
    updateClearFiltersVisibility();
  }
  supplierCheckbox.addEventListener('change', debouncedApplyFilters);
  sistema2Checkbox.addEventListener('change', debouncedApplyFilters);
  entePublicoCheckbox.addEventListener('change', debouncedApplyFilters);
  searchInput.addEventListener('input', debouncedApplyFilters);
  buyerProcuringCheckbox.addEventListener('change', debouncedApplyFilters);
  highParticipationCheckbox.addEventListener('change', debouncedApplyFilters);
  initializeClearFilters();
}

// Función auxiliar para resaltar texto
function highlightText(text, searchTerm) {
  if (!searchTerm || !text) return text || 'No disponible';

  const normalizedText = normalizeText(text);
  const normalizedSearchTerm = normalizeText(searchTerm);
  const index = normalizedText.indexOf(normalizedSearchTerm);

  if (index >= 0) {
    // Usamos el texto original para preservar los acentos en la visualización
    return (
      text.slice(0, index) +
      `<mark class="bg-success text-white">${text.slice(index, index + searchTerm.length)}</mark>` +
      text.slice(index + searchTerm.length)
    );
  }
  return text;
}

function updateParticipacionesDetails(d) {
  var detalleDiv = document.getElementById('detalleParticipaciones');
  detalleDiv.innerHTML = '';
  const searchTerm = document.getElementById('searchInput').value;

  if (d.participaciones) {
    let participaciones = Array.isArray(d.participaciones) ? d.participaciones : [d.participaciones];

    // Filtrar participaciones duplicadas
    const uniqueSet = new Set();
    participaciones = participaciones.filter(participacion => {
      const fullName = `${participacion.nombre || ''} ${participacion.primerApellido || ''} ${
        participacion.segundoApellido || ''
      }`.trim();
      const ente = participacion.nombreEntePublico || 'Ente no disponible';
      const key = `${fullName}|${ente}`;
      if (uniqueSet.has(key)) {
        return false;
      }
      uniqueSet.add(key);
      return true;
    });

    // Crear el contenedor del accordion
    var accordion = document.createElement('div');
    accordion.className = 'accordion accordion-flush';
    var accordionId = 'participacionesAccordion' + Date.now();
    accordion.id = accordionId;

    participaciones.forEach(function (participacion, index) {
      var accordionItem = document.createElement('div');
      accordionItem.className = 'accordion-item';

      var headerId = `heading${accordionId}${index}`;
      var collapseId = `collapse${accordionId}${index}`;

      // Crear el encabezado del accordion
      var header = document.createElement('h2');
      header.className = 'accordion-header';
      header.id = headerId;

      var button = document.createElement('button');
      button.className = 'accordion-button collapsed';
      button.type = 'button';
      button.setAttribute('data-bs-toggle', 'collapse');
      button.setAttribute('data-bs-target', `#${collapseId}`);
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', collapseId);

      // Añadir icono de Font Awesome
      var icon = document.createElement('i');
      icon.className = 'fa fa-user fa-fw me-2';
      button.appendChild(icon);

      // Añadir texto con resaltado
      var textSpan = document.createElement('span');
      const nombreCompleto = `${participacion.nombre || ''} ${participacion.primerApellido || ''} ${
        participacion.segundoApellido || ''
      }`.trim();
      const entePublico = participacion.nombreEntePublico || 'Ente no disponible';
      textSpan.innerHTML = `${highlightText(nombreCompleto, searchTerm)} - ${highlightText(entePublico, searchTerm)}`;
      button.appendChild(textSpan);

      header.appendChild(button);

      // Crear el cuerpo del accordion
      var collapse = document.createElement('div');
      collapse.id = collapseId;
      collapse.className = 'accordion-collapse collapse';
      collapse.setAttribute('aria-labelledby', headerId);
      collapse.setAttribute('data-bs-parent', `#${accordionId}`);

      var body = document.createElement('div');
      body.className = 'accordion-body';

      // Contenido principal con resaltado
      var mainContent = `
        <div><strong>Cargo:</strong> ${highlightText(
          participacion.empleoCargoComision || 'No disponible',
          searchTerm,
        )}</div>
        <div><strong>Fecha de posesión:</strong> ${participacion.fechaTomaPosesion || 'No disponible'}</div>
        <div><strong>Área de adscripción:</strong> ${highlightText(
          participacion.areaAdscripcion || 'No disponible',
          searchTerm,
        )}</div>
        <div><strong>Porcentaje de participación:</strong> ${
          participacion.porcentajeParticipacion !== undefined
            ? participacion.porcentajeParticipacion >= 50
              ? `<span class="badge bg-danger">${participacion.porcentajeParticipacion}%</span>`
              : `${participacion.porcentajeParticipacion}%`
            : 'No disponible'
        }</div>
        <div><strong>Recibe remuneración:</strong> ${
          participacion.recibeRemuneracion !== undefined
            ? participacion.recibeRemuneracion
              ? 'Sí'
              : 'No'
            : 'No disponible'
        }</div>
        <div><strong>Tipo de participación:</strong> ${participacion.tipoParticipacion || 'No disponible'}</div>
        <div><strong>Sector de participación:</strong> ${participacion.sectorParticipacion || 'No disponible'}</div>
      `;

      body.innerHTML = mainContent;

      // Contenido de sistema2 con resaltado
      /* if (participacion.sistema2) {
        var s2 = participacion.sistema2;
        var sistema2Content = `
          <div class="mt-2">
            <div style="color: #b25fac; font-weight: bold;">Información del Sistema 2:</div>
            <ul>
              <li style="color: #b25fac;"><strong>Nombres:</strong> ${highlightText(s2.nombres || "No disponible", searchTerm)}</li>
              <li style="color: #b25fac;"><strong>Primer Apellido:</strong> ${highlightText(s2.primerApellido || "No disponible", searchTerm)}</li>
              <li style="color: #b25fac;"><strong>Segundo Apellido:</strong> ${highlightText(s2.segundoApellido || "No disponible", searchTerm)}</li>
              <li style="color: #b25fac;"><strong>Institución:</strong> <span class="badge bg-secondary">${highlightText(s2.institucionDependencia?.nombre || "No disponible", searchTerm)}</span></li>
              <li style="color: #b25fac;"><strong>Puesto:</strong> ${highlightText(s2.puesto?.nombre || "No disponible", searchTerm)}</li>
              <li style="color: #b25fac;"><strong>Nivel:</strong> ${s2.puesto?.nivel || "No disponible"}</li>
              <li style="color: #b25fac;"><strong>Nivel de Responsabilidad:</strong> ${s2.nivelResponsabilidad?.map(nr => nr.valor).join(", ") || "No disponible"}</li>
              <li style="color: #b25fac;"><strong>Tipo de Procedimiento:</strong> ${s2.tipoProcedimiento?.map(tp => tp.valor).join(", ") || "No disponible"}</li>
            </ul>
          </div>
        `;
        body.innerHTML += sistema2Content;
      } */

      collapse.appendChild(body);
      accordionItem.appendChild(header);
      accordionItem.appendChild(collapse);
      accordion.appendChild(accordionItem);
    });

    detalleDiv.appendChild(accordion);
  } else {
    detalleDiv.innerHTML = '<p>No hay detalles de participaciones disponibles.</p>';
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
