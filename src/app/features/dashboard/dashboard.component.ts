import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatabaseService } from '../../core/services/database.service';
import { Alumno, Registro } from '../../core/models';
import * as XLSX from 'xlsx';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarController,
  DoughnutController
} from 'chart.js';

// Registrar componentes de Chart.js
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarController,
  DoughnutController
);

interface FiltrosFormulario {
  fechaInicio: FormControl<Date | null>;
  fechaFin: FormControl<Date | null>;
  carrera: FormControl<string | null>;
  motivo: FormControl<string | null>;
  busqueda: FormControl<string | null>;
}

interface EstadisticasCarrera {
  carrera: string;
  cantidad: number;
}

interface EstadisticasMotivo {
  motivo: string;
  cantidad: number;
}

interface RegistrosPorDia {
  fecha: string;
  cantidad: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  // Referencias a canvas para gráficas
  @ViewChild('chartRegistrosPorDia') chartRegistrosPorDiaRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartMotivos') chartMotivosRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCarreras') chartCarrerasRef?: ElementRef<HTMLCanvasElement>;

  // Instancias de gráficas
  chartRegistrosPorDia?: Chart;
  chartMotivos?: Chart;
  chartCarreras?: Chart;

  // Datos originales
  alumnos: Alumno[] = [];
  todosLosRegistros: Registro[] = [];
  
  // Datos filtrados
  alumnosFiltrados: Alumno[] = [];
  registrosFiltrados: Registro[] = [];
  registrosHoyFiltrados: Registro[] = [];
  
  // Estadísticas
  totalAlumnos = 0;
  totalRegistrosHoy = 0;
  totalRegistros = 0;
  
  // Estadísticas adicionales
  topCarreras: EstadisticasCarrera[] = [];
  distribucionMotivos: EstadisticasMotivo[] = [];
  registrosPorDia: RegistrosPorDia[] = [];
  
  // Listas únicas para filtros
  carrerasUnicas: string[] = [];
  motivosUnicos: string[] = [];
  
  // Estado
  cargando = true;
  
  // Formulario de filtros
  filtrosForm = new FormGroup<FiltrosFormulario>({
    fechaInicio: new FormControl<Date | null>(null),
    fechaFin: new FormControl<Date | null>(null),
    carrera: new FormControl<string | null>(null),
    motivo: new FormControl<string | null>(null),
    busqueda: new FormControl<string | null>(null)
  });
  
  // Columnas de tablas
  columnasAlumnos: string[] = ['matricula', 'nombre', 'carrera', 'grado', 'grupo', 'turno', 'acciones'];
  columnasRegistros: string[] = ['fechaHora', 'matricula', 'nombre', 'carrera', 'motivo'];

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
      private toastService: ToastService  // ← AGREGAR ESTA LÍNEA
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
    this.configurarFiltros();
  }

  ngAfterViewInit(): void {
    // Esperar un momento para que los canvas estén listos
    setTimeout(() => {
      this.crearGraficas();
    }, 100);
  }

  async cargarDatos(): Promise<void> {
    try {
      this.cargando = true;

      // Cargar alumnos
      this.alumnos = await this.databaseService.obtenerTodosLosAlumnos();
      this.alumnosFiltrados = [...this.alumnos];
      this.totalAlumnos = this.alumnos.length;

      // Cargar todos los registros
      this.todosLosRegistros = await this.databaseService.obtenerTodosLosRegistros();
      this.registrosFiltrados = [...this.todosLosRegistros];
      this.totalRegistros = this.todosLosRegistros.length;

      // Obtener registros de hoy
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      this.registrosHoyFiltrados = this.todosLosRegistros.filter(registro => {
        const fechaRegistro = new Date(registro.fechaHora);
        fechaRegistro.setHours(0, 0, 0, 0);
        return fechaRegistro.getTime() === hoy.getTime();
      });
      this.totalRegistrosHoy = this.registrosHoyFiltrados.length;

      // Extraer valores únicos para filtros
      this.extraerValoresUnicos();

      // Calcular estadísticas
      this.calcularEstadisticas();

      console.log('📊 Dashboard cargado:');
      console.log('   - Alumnos:', this.totalAlumnos);
      console.log('   - Registros hoy:', this.totalRegistrosHoy);
      console.log('   - Registros totales:', this.totalRegistros);

      this.cargando = false;
    } catch (error) {
      console.error('❌ Error al cargar datos del dashboard:', error);
      this.cargando = false;
    }
  }

  extraerValoresUnicos(): void {
    // Carreras únicas
    const carrerasSet = new Set<string>();
    this.alumnos.forEach(alumno => carrerasSet.add(alumno.carrera));
    this.carrerasUnicas = Array.from(carrerasSet).sort();

    // Motivos únicos
    const motivosSet = new Set<string>();
    this.todosLosRegistros.forEach(registro => {
      if (registro.motivoNombre) {
        motivosSet.add(registro.motivoNombre);
      }
    });
    this.motivosUnicos = Array.from(motivosSet).sort();
  }

  calcularEstadisticas(): void {
    // Top 5 Carreras
    const carrerasCount = new Map<string, number>();
    this.todosLosRegistros.forEach(registro => {
      const alumno = this.alumnos.find(a => a.matricula === registro.matricula);
      if (alumno) {
        const count = carrerasCount.get(alumno.carrera) || 0;
        carrerasCount.set(alumno.carrera, count + 1);
      }
    });

    this.topCarreras = Array.from(carrerasCount.entries())
      .map(([carrera, cantidad]) => ({ carrera, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // Distribución por Motivos
    const motivosCount = new Map<string, number>();
    this.todosLosRegistros.forEach(registro => {
      if (registro.motivoNombre) {
        const count = motivosCount.get(registro.motivoNombre) || 0;
        motivosCount.set(registro.motivoNombre, count + 1);
      }
    });

    this.distribucionMotivos = Array.from(motivosCount.entries())
      .map(([motivo, cantidad]) => ({ motivo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Registros por día (últimos 7 días)
    const hoy = new Date();
    const registrosPorDiaMap = new Map<string, number>();
    
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      fecha.setHours(0, 0, 0, 0);
      
      const fechaStr = this.formatearFechaCorta(fecha);
      registrosPorDiaMap.set(fechaStr, 0);
    }

    this.todosLosRegistros.forEach(registro => {
      const fecha = new Date(registro.fechaHora);
      fecha.setHours(0, 0, 0, 0);
      const fechaStr = this.formatearFechaCorta(fecha);
      
      if (registrosPorDiaMap.has(fechaStr)) {
        const count = registrosPorDiaMap.get(fechaStr) || 0;
        registrosPorDiaMap.set(fechaStr, count + 1);
      }
    });

    this.registrosPorDia = Array.from(registrosPorDiaMap.entries())
      .map(([fecha, cantidad]) => ({ fecha, cantidad }));
  }

  crearGraficas(): void {
    this.crearGraficaRegistrosPorDia();
    this.crearGraficaMotivos();
    this.crearGraficaCarreras();
  }

  crearGraficaRegistrosPorDia(): void {
    if (!this.chartRegistrosPorDiaRef) return;

    const ctx = this.chartRegistrosPorDiaRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Destruir gráfica anterior si existe
    if (this.chartRegistrosPorDia) {
      this.chartRegistrosPorDia.destroy();
    }

    this.chartRegistrosPorDia = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.registrosPorDia.map(r => r.fecha),
        datasets: [{
          label: 'Registros',
          data: this.registrosPorDia.map(r => r.cantidad),
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Registros de los Últimos 7 Días',
            font: {
              size: 16,
              weight: 'bold'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  crearGraficaMotivos(): void {
    if (!this.chartMotivosRef) return;

    const ctx = this.chartMotivosRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chartMotivos) {
      this.chartMotivos.destroy();
    }

    const colores = [
      'rgba(249, 147, 251, 0.8)',
      'rgba(102, 126, 234, 0.8)',
      'rgba(79, 172, 254, 0.8)',
      'rgba(250, 192, 19, 0.8)',
      'rgba(245, 87, 108, 0.8)'
    ];

    this.chartMotivos = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.distribucionMotivos.map(m => m.motivo),
        datasets: [{
          data: this.distribucionMotivos.map(m => m.cantidad),
          backgroundColor: colores,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Distribución por Motivos',
            font: {
              size: 16,
              weight: 'bold'
            }
          }
        }
      }
    });
  }

  crearGraficaCarreras(): void {
    if (!this.chartCarrerasRef) return;

    const ctx = this.chartCarrerasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chartCarreras) {
      this.chartCarreras.destroy();
    }

    this.chartCarreras = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.topCarreras.map(c => c.carrera),
        datasets: [{
          label: 'Registros',
          data: this.topCarreras.map(c => c.cantidad),
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(249, 147, 251, 0.8)',
            'rgba(79, 172, 254, 0.8)',
            'rgba(250, 192, 19, 0.8)',
            'rgba(245, 87, 108, 0.8)'
          ],
          borderWidth: 2,
          borderColor: '#fff',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Top 5 Carreras Más Frecuentes',
            font: {
              size: 16,
              weight: 'bold'
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  configurarFiltros(): void {
    this.filtrosForm.valueChanges.subscribe(() => {
      this.aplicarFiltros();
    });
  }

  aplicarFiltros(): void {
    const valores = this.filtrosForm.value;

    // Filtrar alumnos
    this.alumnosFiltrados = this.alumnos.filter(alumno => {
      if (valores.carrera && alumno.carrera !== valores.carrera) {
        return false;
      }

      if (valores.busqueda) {
        const busquedaLower = valores.busqueda.toLowerCase();
        const nombreCompleto = this.obtenerNombreCompleto(alumno).toLowerCase();
        const coincide = 
          alumno.matricula.toLowerCase().includes(busquedaLower) ||
          nombreCompleto.includes(busquedaLower);
        
        if (!coincide) {
          return false;
        }
      }

      return true;
    });

    // Filtrar registros
    this.registrosFiltrados = this.todosLosRegistros.filter(registro => {
      if (valores.fechaInicio) {
        const fechaInicio = new Date(valores.fechaInicio);
        fechaInicio.setHours(0, 0, 0, 0);
        const fechaRegistro = new Date(registro.fechaHora);
        fechaRegistro.setHours(0, 0, 0, 0);
        
        if (fechaRegistro < fechaInicio) {
          return false;
        }
      }

      if (valores.fechaFin) {
        const fechaFin = new Date(valores.fechaFin);
        fechaFin.setHours(23, 59, 59, 999);
        const fechaRegistro = new Date(registro.fechaHora);
        
        if (fechaRegistro > fechaFin) {
          return false;
        }
      }

      if (valores.carrera) {
        const alumno = this.alumnos.find(a => a.matricula === registro.matricula);
        if (!alumno || alumno.carrera !== valores.carrera) {
          return false;
        }
      }

      if (valores.motivo && registro.motivoNombre !== valores.motivo) {
        return false;
      }

      if (valores.busqueda) {
        const busquedaLower = valores.busqueda.toLowerCase();
        const coincide = 
          registro.matricula.toLowerCase().includes(busquedaLower) ||
          registro.nombreCompleto.toLowerCase().includes(busquedaLower);
        
        if (!coincide) {
          return false;
        }
      }

      return true;
    });

    // Filtrar registros de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    this.registrosHoyFiltrados = this.registrosFiltrados.filter(registro => {
      const fechaRegistro = new Date(registro.fechaHora);
      fechaRegistro.setHours(0, 0, 0, 0);
      return fechaRegistro.getTime() === hoy.getTime();
    });

    console.log('🔍 Filtros aplicados:');
    console.log('   - Alumnos filtrados:', this.alumnosFiltrados.length);
    console.log('   - Registros filtrados:', this.registrosFiltrados.length);
    console.log('   - Registros hoy filtrados:', this.registrosHoyFiltrados.length);
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset();
    this.alumnosFiltrados = [...this.alumnos];
    this.registrosFiltrados = [...this.todosLosRegistros];
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    this.registrosHoyFiltrados = this.todosLosRegistros.filter(registro => {
      const fechaRegistro = new Date(registro.fechaHora);
      fechaRegistro.setHours(0, 0, 0, 0);
      return fechaRegistro.getTime() === hoy.getTime();
    });
  }

  exportarCSV(tipo: 'alumnos' | 'registros' | 'registros-hoy'): void {
    let datos: any[] = [];
    let nombreArchivo = '';

    switch (tipo) {
      case 'alumnos':
        datos = this.alumnosFiltrados.map(alumno => ({
          'Matrícula': alumno.matricula,
          'Nombre': alumno.nombre,
          'Apellido Paterno': alumno.apellidoPaterno,
          'Apellido Materno': alumno.apellidoMaterno,
          'Carrera': alumno.carrera,
          'Grado': alumno.grado,
          'Grupo': alumno.grupo,
          'Turno': alumno.turno
        }));
        nombreArchivo = 'stenbrary-alumnos';
        break;

      case 'registros':
        datos = this.registrosFiltrados.map(registro => ({
          'Fecha y Hora': this.formatearFechaExport(registro.fechaHora),
          'Matrícula': registro.matricula,
          'Nombre Completo': registro.nombreCompleto,
          'Carrera': this.obtenerCarreraDeRegistro(registro),
          'Motivo': registro.motivoNombre
        }));
        nombreArchivo = 'stenbrary-registros-completo';
        break;

      case 'registros-hoy':
        datos = this.registrosHoyFiltrados.map(registro => ({
          'Fecha y Hora': this.formatearFechaExport(registro.fechaHora),
          'Matrícula': registro.matricula,
          'Nombre Completo': registro.nombreCompleto,
          'Carrera': this.obtenerCarreraDeRegistro(registro),
          'Motivo': registro.motivoNombre
        }));
        nombreArchivo = 'stenbrary-registros-hoy';
        break;
    }

   if (datos.length === 0) {
  this.toastService.warning('No hay datos para exportar');
  return;
}

    const ws = XLSX.utils.json_to_sheet(datos);
    const csv = XLSX.utils.sheet_to_csv(ws);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${nombreArchivo}-${this.obtenerFechaActual()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`✅ Exportado CSV: ${nombreArchivo} (${datos.length} registros)`);
this.toastService.success('Archivo CSV descargado exitosamente');  // ← AGREGAR

  }

  exportarExcel(tipo: 'alumnos' | 'registros' | 'registros-hoy'): void {
    let datos: any[] = [];
    let nombreHoja = '';
    let nombreArchivo = '';

    switch (tipo) {
      case 'alumnos':
        datos = this.alumnosFiltrados.map(alumno => ({
          'Matrícula': alumno.matricula,
          'Nombre': alumno.nombre,
          'Apellido Paterno': alumno.apellidoPaterno,
          'Apellido Materno': alumno.apellidoMaterno,
          'Carrera': alumno.carrera,
          'Grado': alumno.grado,
          'Grupo': alumno.grupo,
          'Turno': alumno.turno
        }));
        nombreHoja = 'Alumnos';
        nombreArchivo = 'stenbrary-alumnos';
        break;

      case 'registros':
        datos = this.registrosFiltrados.map(registro => ({
          'Fecha y Hora': this.formatearFechaExport(registro.fechaHora),
          'Matrícula': registro.matricula,
          'Nombre Completo': registro.nombreCompleto,
          'Carrera': this.obtenerCarreraDeRegistro(registro),
          'Motivo': registro.motivoNombre
        }));
        nombreHoja = 'Registros';
        nombreArchivo = 'stenbrary-registros-completo';
        break;

      case 'registros-hoy':
        datos = this.registrosHoyFiltrados.map(registro => ({
          'Fecha y Hora': this.formatearFechaExport(registro.fechaHora),
          'Matrícula': registro.matricula,
          'Nombre Completo': registro.nombreCompleto,
          'Carrera': this.obtenerCarreraDeRegistro(registro),
          'Motivo': registro.motivoNombre
        }));
        nombreHoja = 'Registros Hoy';
        nombreArchivo = 'stenbrary-registros-hoy';
        break;
    }

   if (datos.length === 0) {
  this.toastService.warning('No hay datos para exportar');
  return;
}

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);

    XLSX.writeFile(wb, `${nombreArchivo}-${this.obtenerFechaActual()}.xlsx`);

console.log(`✅ Exportado Excel: ${nombreArchivo} (${datos.length} registros)`);
this.toastService.success('Archivo Excel descargado exitosamente');  // ← AGREGAR



  }

  obtenerNombreCompleto(alumno: Alumno): string {
    return `${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}`;
  }

  obtenerCarreraDeRegistro(registro: Registro): string {
    const alumno = this.alumnos.find(a => a.matricula === registro.matricula);
    return alumno ? alumno.carrera : 'N/A';
  }

  formatearFecha(fecha: Date): string {
    const date = new Date(fecha);
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearFechaExport(fecha: Date): string {
    const date = new Date(fecha);
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatearFechaCorta(fecha: Date): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dia = dias[fecha.getDay()];
    const diaNum = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    return `${dia} ${diaNum}/${mes}`;
  }

  obtenerFechaActual(): string {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}${mes}${dia}`;
  }

  volverScanner(): void {
    this.router.navigate(['/scanner']);
  }


  irDashboardEjecutivo(): void {
  this.router.navigate(['/dashboard-ejecutivo']);
}

irGestionMotivos(): void {
  this.router.navigate(['/gestion-motivos']);
}

  verDetalleAlumno(alumno: Alumno): void {
  this.router.navigate(['/detalle-alumno', alumno.matricula]);
}

  async actualizarDatos(): Promise<void> {
    await this.cargarDatos();
    
    // Recrear gráficas con nuevos datos
    setTimeout(() => {
      this.crearGraficas();
    }, 100);
  }

  ngOnDestroy(): void {
    // Limpiar gráficas al destruir el componente
    if (this.chartRegistrosPorDia) {
      this.chartRegistrosPorDia.destroy();
    }
    if (this.chartMotivos) {
      this.chartMotivos.destroy();
    }
    if (this.chartCarreras) {
      this.chartCarreras.destroy();
    }
  }
}