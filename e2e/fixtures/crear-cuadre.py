# Conjunto de cuadre: resultados calculados a mano (ver ESPERADO al final).
# "Hoy" = miércoles 7 oct 2026 12:00 (Nuevo Laredo, CDT -05:00).
import json, sys

def alumno(i, mat, nombre, carrera, turno, grado, activo=True):
    return {"id": f"a{i}", "matricula": mat, "nombre": nombre, "apellidoPaterno": "Prueba",
            "apellidoMaterno": "Cuadre", "carrera": carrera, "grado": grado, "grupo": "A",
            "turno": turno, "activo": activo, "fechaRegistro": "2026-01-10T10:00:00-06:00",
            "datosExtra": {}}

A = [
    alumno(1, "2200000001", "Ana", "Ing. TI", "Matutino", 3),
    alumno(2, "2200000002", "Beto", "Ing. TI", "Vespertino", 5),
    alumno(3, "2200000003", "Caro", "Derecho", "Matutino", 1),
    alumno(4, "2200000004", "Dani", "Derecho", "Mixto", 7),           # nunca vino
    alumno(5, "2200000005", "Eva", "Ing. TI", "Matutino", 3),         # última visita hace 40 días
    alumno(6, "2200000006", "Fer", "Derecho", "Matutino", 2, False),  # desactivado
]
M = [
    {"id": "m1", "nombre": "Estudiar", "icono": "school", "orden": 1, "activo": True, "color": "#00C8D7"},
    {"id": "m2", "nombre": "Pedir libro", "icono": "book", "orden": 2, "activo": True, "color": "#F5A623"},
    {"id": "m3", "nombre": "Trabajo escolar", "icono": "work", "orden": 3, "activo": True, "color": "#6366F1"},
]
nombres = {m["id"]: m["nombre"] for m in M}

def reg(i, a, fecha, motivos, salida=None, dur=None, estimada=False, turno=None):
    al = next((x for x in A if x["matricula"] == a), None)
    r = {"id": f"r{i}", "alumnoId": al["id"] if al else f"invitado-{i}", "matricula": a,
         "nombreCompleto": f"{al['nombre']} Prueba Cuadre" if al else "Visitante Invitado",
         "carrera": al["carrera"] if al else "Visitante",
         "motivoId": motivos[0], "motivoNombre": nombres[motivos[0]],
         "motivoIds": motivos, "motivoNombres": [nombres[m] for m in motivos],
         "fechaHora": fecha, "sincronizado": False}
    if turno or al: r["turno"] = turno or al["turno"]
    if salida: r["horaSalida"] = salida
    if dur is not None: r["duracionMinutos"] = dur
    if estimada: r["salidaEstimada"] = True
    return r

T = "-05:00"
R = [
    # Lunes 5 oct
    reg(1, "2200000001", f"2026-10-05T10:00:00{T}", ["m1"], f"2026-10-05T11:30:00{T}", 90),
    reg(2, "2200000002", f"2026-10-05T10:15:00{T}", ["m1", "m2"], f"2026-10-05T10:45:00{T}", 30),
    reg(3, "2200000003", f"2026-10-05T16:00:00{T}", ["m3"]),
    # Martes 6 oct
    reg(4, "2200000001", f"2026-10-06T09:00:00{T}", ["m1"], f"2026-10-06T13:00:00{T}", 240, estimada=True),
    reg(5, "INVITADO", f"2026-10-06T11:00:00{T}", ["m2"]),
    # Miércoles 7 oct (hoy)
    reg(6, "2200000002", f"2026-10-07T09:30:00{T}", ["m3"]),
    # Semana anterior (para la tendencia)
    reg(7, "2200000001", f"2026-09-28T10:00:00{T}", ["m1"]),
    reg(8, "2200000003", f"2026-09-29T10:00:00{T}", ["m1"]),
    # Eva: hace 40 días
    reg(9, "2200000005", f"2026-08-28T10:00:00{T}", ["m1"]),
    # Semana anterior, pero DESPUÉS de las 12:00 del miércoles 30: no debe contar
    # al comparar "al mismo avance".
    reg(10, "2200000002", f"2026-09-30T15:00:00{T}", ["m1"]),
]
datos = {"meta": {"version": "3.4", "fecha": "2026-10-07T12:00:00-05:00", "app": "Stenbrary",
                  "totalAlumnos": len(A), "totalRegistros": len(R), "totalMotivos": len(M)},
         "alumnos": A, "registros": R, "motivos": M}
json.dump(datos, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("ok", len(A), len(R))
