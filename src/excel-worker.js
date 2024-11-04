// Crear el Worker inline
function createWorker() {
  const workerCode = `
      // Importar las librerías necesarias
      importScripts(
        'https://cdn.sheetjs.com/xlsx-0.19.3/package/dist/xlsx.full.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
      );

      self.onmessage = async function(e) {
        const { empresas, batchSize = 5 } = e.data;
        const zip = new JSZip();

        try {
          // Procesar en lotes
          for (let i = 0; i < empresas.length; i += batchSize) {
            const batch = empresas.slice(i, i + batchSize);

            for (const empresa of batch) {
              const wb = createExcelWorkbook(empresa);
              const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
              const fileName = \`\${empresa.nombreEmpresa || 'Empresa'}_\${empresa.rfc || 'RFC'}.xlsx\`;
              zip.file(fileName, excelBuffer);
            }

            // Informar progreso
            self.postMessage({
              type: 'progress',
              progress: Math.min(100, (i + batchSize) / empresas.length * 100)
            });
          }

          // Generar el ZIP
          const zipContent = await zip.generateAsync({
            type: 'arraybuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
          });

          self.postMessage({
            type: 'complete',
            data: zipContent
          });
        } catch (error) {
          self.postMessage({
            type: 'error',
            error: error.message
          });
        }
      };

      function createExcelWorkbook(empresa) {
        // Asegurarnos que participaciones sea un arreglo
        let participaciones = [];
        if (empresa.participaciones) {
          participaciones = Array.isArray(empresa.participaciones)
            ? empresa.participaciones
            : [empresa.participaciones];

          // Filtrar participaciones duplicadas
          const uniqueSet = new Set();
          participaciones = participaciones.filter(participacion => {
            const fullName = \`\${participacion.nombre || ""} \${participacion.primerApellido || ""} \${participacion.segundoApellido || ""}\`.trim();
            const ente = participacion.nombreEntePublico || "Ente no disponible";
            const key = \`\${fullName}|\${ente}\`;
            if (uniqueSet.has(key)) return false;
            uniqueSet.add(key);
            return true;
          });
        }

        // Preparar los datos para cada hoja
        const participacionesData = participaciones.map(p => ({
          'Nombre': \`\${p.nombre || ''} \${p.primerApellido || ''} \${p.segundoApellido || ''}\`.trim() || 'No disponible',
          'Ente Público': p.nombreEntePublico || 'No disponible',
          'Cargo': p.empleoCargoComision || 'No disponible',
          'Fecha de Posesión': p.fechaTomaPosesion || 'No disponible',
          'Contratado por Honorarios': p.contratadoPorHonorarios ? 'Sí' : 'No',
          'Área de Adscripción': p.areaAdscripcion || 'No disponible',
          'Porcentaje de Participación': p.porcentajeParticipacion || 'No disponible',
          'Recibe Remuneración': p.recibeRemuneracion ? 'Sí' : 'No',
          'Tipo de Participación': p.tipoParticipacion || 'No disponible',
          'Sector de Participación': p.sectorParticipacion || 'No disponible',
        }));

        const contratacionesData = (empresa.children || []).map(child => ({
          'Título de Licitación': child.tender?.title || 'No disponible',
          'Fecha Inicio': child.tender?.tenderPeriod?.startDate || 'No disponible',
          'Fecha Término': child.tender?.awardPeriod?.endDate || 'No disponible',
          'Método de Contratación': child.tender?.procurementMethod || 'No disponible',
          'Comprador': child.buyer?.name || 'No disponible',
          'Estatus': child.tender?.status || 'No disponible',
          'Es Proveedor': child.partiesMatch?.isSupplier ? 'Sí' : 'No',
          'Coincidencia Ente Público': child.hasEntePublicoMatch ? 'Sí' : 'No',
          'Coincidencia Sistema 2': child.hasSistema2 ? 'Sí' : 'No',
          'Buyer': child.buyerAndProcuringEntities?.buyer?.name || 'No disponible',
          'Procuring Entity': child.buyerAndProcuringEntities?.procuringEntity?.name || 'No disponible',
          'Monto Adjudicado': child.awards?.[0]?.value?.amount || 'No disponible',
          'Moneda': child.awards?.[0]?.value?.currency || 'No disponible',
          'Estatus Award': child.awards?.[0]?.status || 'No disponible',
          'Proveedor ID': child.awards?.[0]?.suppliers?.[0]?.id || 'No disponible',
          'Proveedor Nombre': child.awards?.[0]?.suppliers?.[0]?.name || 'No disponible'
        }));

        // Crear el workbook
        const wb = XLSX.utils.book_new();

        // Agregar las hojas
        if (participacionesData.length > 0) {
          const ws1 = XLSX.utils.json_to_sheet(participacionesData);
          const wscols1 = Object.keys(participacionesData[0]).map(() => ({ wch: 20 }));
          ws1['!cols'] = wscols1;
          XLSX.utils.book_append_sheet(wb, ws1, "Participaciones");
        } else {
          const ws1 = XLSX.utils.aoa_to_sheet([["No hay datos de participaciones disponibles"]]);
          XLSX.utils.book_append_sheet(wb, ws1, "Participaciones");
        }

        if (contratacionesData.length > 0) {
          const ws2 = XLSX.utils.json_to_sheet(contratacionesData);
          const wscols2 = Object.keys(contratacionesData[0]).map(() => ({ wch: 20 }));
          ws2['!cols'] = wscols2;
          XLSX.utils.book_append_sheet(wb, ws2, "Procesos de Contratación");
        } else {
          const ws2 = XLSX.utils.aoa_to_sheet([["No hay datos de procesos de contratación disponibles"]]);
          XLSX.utils.book_append_sheet(wb, ws2, "Procesos de Contratación");
        }

        return wb;
      }
    `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}
