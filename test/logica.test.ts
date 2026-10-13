import { describe, expect, it } from "vitest";
import {
  CONFIG,
  acertarPalabra,
  actualizarTiempo,
  empezarRonda,
  crearEstadoInicial,
  quedanPocosSegundos,
  marcarFalta,
} from "../src/logica";

describe("La lógica de La Palabra Prohibida", () => {
  it("arma el estado inicial con la ronda sin empezar y los contadores en cero", () => {
    const estado = crearEstadoInicial(123);

    expect(estado).toMatchObject({
      fase: "sin_empezar",
      resultado: null,
      cartaActual: null,
      aciertos: 0,
      faltas: 0,
      segundosRestantes: CONFIG.DURACION_RONDA_SEGUNDOS,
      mazo: [],
      cartasUsadas: [],
    });
    expect(estado.generarAleatorio).toEqual(expect.any(Function));
  });

  it("empieza la ronda con PUPUSA y reinicia el tiempo y los contadores", () => {
    const estado = crearEstadoInicial(123);

    expect(empezarRonda(estado)).toBe(true);
    expect(estado.fase).toBe("en_curso");
    expect(estado.cartaActual?.palabra).toBe("PUPUSA");
    expect(estado.cartaActual?.prohibidas).toHaveLength(5);
    expect(estado.segundosRestantes).toBe(CONFIG.DURACION_RONDA_SEGUNDOS);
    expect(estado.aciertos).toBe(0);
    expect(estado.faltas).toBe(0);
    expect(estado.mazo).toHaveLength(6);
  });

  it("suma un acierto y muestra otra carta cuando la ronda está en curso", () => {
    const estado = crearEstadoInicial(123);
    empezarRonda(estado);

    expect(acertarPalabra(estado)).toBe(true);
    expect(estado.aciertos).toBe(1);
    expect(estado.cartaActual?.palabra).not.toBe("PUPUSA");
  });

  it("suma una falta y muestra otra carta cuando la ronda está en curso", () => {
    const estado = crearEstadoInicial(123);
    empezarRonda(estado);

    expect(marcarFalta(estado)).toBe(true);
    expect(estado.faltas).toBe(1);
    expect(estado.cartaActual?.palabra).not.toBe("PUPUSA");
  });

  it("rechaza los aciertos y las faltas antes de empezar sin cambiar el estado", () => {
    const estado = crearEstadoInicial(123);

    expect(acertarPalabra(estado)).toBe(false);
    expect(marcarFalta(estado)).toBe(false);
    expect(estado.aciertos).toBe(0);
    expect(estado.faltas).toBe(0);
    expect(estado.cartaActual).toBeNull();
  });

  it("gana con cinco aciertos antes de que se acabe el tiempo", () => {
    const estado = crearEstadoInicial(123);
    empezarRonda(estado);

    for (let acierto = 0; acierto < CONFIG.ACIERTOS_PARA_GANAR; acierto += 1) {
      expect(acertarPalabra(estado)).toBe(true);
    }

    expect(estado.fase).toBe("ganada");
    expect(estado.resultado).toBe("ganaron");
    expect(estado.aciertos).toBe(CONFIG.ACIERTOS_PARA_GANAR);
    expect(estado.segundosRestantes).toBeGreaterThan(0);
  });

  it("pierde al llegar a tres faltas y rechaza acciones después de terminar", () => {
    const estado = crearEstadoInicial(123);
    empezarRonda(estado);

    for (let falta = 0; falta < CONFIG.FALTAS_PARA_PERDER; falta += 1) {
      expect(marcarFalta(estado)).toBe(true);
    }

    expect(estado.fase).toBe("perdida");
    expect(estado.resultado).toBe("tres_faltas");
    expect(estado.faltas).toBe(CONFIG.FALTAS_PARA_PERDER);
    expect(acertarPalabra(estado)).toBe(false);
    expect(marcarFalta(estado)).toBe(false);
  });

  it("actualiza el tiempo, marca menos de diez segundos y pierde al llegar a cero", () => {
    const estado = crearEstadoInicial(123);
    empezarRonda(estado);

    expect(actualizarTiempo(estado, CONFIG.DURACION_RONDA_SEGUNDOS - 10)).toBe(true);
    expect(estado.segundosRestantes).toBe(10);
    expect(quedanPocosSegundos(estado)).toBe(false);

    expect(actualizarTiempo(estado, 1)).toBe(true);
    expect(quedanPocosSegundos(estado)).toBe(true);
    expect(actualizarTiempo(estado, 20)).toBe(true);
    expect(estado.segundosRestantes).toBe(0);
    expect(estado.fase).toBe("perdida");
    expect(estado.resultado).toBe("tiempo_agotado");
  });

  it("rechaza un tiempo inválido o una actualización fuera de la ronda", () => {
    const estado = crearEstadoInicial(123);

    expect(actualizarTiempo(estado, 1)).toBe(false);
    empezarRonda(estado);
    expect(actualizarTiempo(estado, -1)).toBe(false);
    expect(actualizarTiempo(estado, Number.NaN)).toBe(false);
    expect(estado.segundosRestantes).toBe(CONFIG.DURACION_RONDA_SEGUNDOS);
  });

  it("permite jugar una ronda completa hasta llegar al final bueno", () => {
    const estado = crearEstadoInicial(2026);

    expect(empezarRonda(estado)).toBe(true);
    expect(estado.cartaActual?.palabra).toBe("PUPUSA");

    for (let turno = 0; turno < CONFIG.ACIERTOS_PARA_GANAR; turno += 1) {
      expect(estado.fase).toBe("en_curso");
      expect(estado.cartaActual).not.toBeNull();
      expect(actualizarTiempo(estado, 1)).toBe(true);
      expect(acertarPalabra(estado)).toBe(true);
    }

    expect(estado.aciertos).toBe(5);
    expect(estado.faltas).toBe(0);
    expect(estado.segundosRestantes).toBe(55);
    expect(estado.fase).toBe("ganada");
    expect(estado.resultado).toBe("ganaron");
  });
});
