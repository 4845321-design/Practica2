export const CONFIG = {
  // Unidad: segundos.
  DURACION_RONDA_SEGUNDOS: 60,
  // Unidad: aciertos.
  ACIERTOS_PARA_GANAR: 5,
  // Unidad: faltas.
  FALTAS_PARA_PERDER: 3,
  // Unidad: segundos.
  SEGUNDOS_PARA_ALERTA: 10,
  // Unidad: cartas.
  CARTAS_MINIMAS: 7,
  // Unidad: cartas.
  CARTAS_MAXIMAS: 15,
  // Unidad: píxeles.
  TAMANO_MINIMO_BOTON_PX: 44,
  // Unidad: posiciones de arreglo.
  PASO_INDICE: 1,
  // Unidad: índice de arreglo.
  INDICE_INICIAL: 0,
  // Unidad: desplazamientos en bits del generador.
  DESPLAZAMIENTO_IZQUIERDA_UNO: 13,
  // Unidad: desplazamientos en bits del generador.
  DESPLAZAMIENTO_DERECHA: 17,
  // Unidad: desplazamientos en bits del generador.
  DESPLAZAMIENTO_IZQUIERDA_DOS: 5,
  // Unidad: valor de semilla sin unidad.
  SEMILLA_CERO: 0,
  // Unidad: valor de semilla sin unidad.
  SEMILLA_ALTERNATIVA: 1831565813,
  // Unidad: desplazamiento de bits.
  DESPLAZAMIENTO_NORMALIZACION: 0,
  // Unidad: valores posibles de un entero sin signo de 32 bits.
  RANGO_UINT32: 4294967296,
} as const;

export type PalabrasProhibidas = readonly [string, string, string, string, string];

export interface Carta {
  readonly palabra: string;
  readonly prohibidas: PalabrasProhibidas;
}

export type FaseRonda = "sin_empezar" | "en_curso" | "ganada" | "perdida";
export type ResultadoRonda = "ganaron" | "tiempo_agotado" | "tres_faltas" | null;
export type GeneradorAleatorio = () => number;

export interface EstadoJuego {
  fase: FaseRonda;
  resultado: ResultadoRonda;
  cartaActual: Carta | null;
  aciertos: number;
  faltas: number;
  segundosRestantes: number;
  mazo: Carta[];
  cartasUsadas: Carta[];
  generarAleatorio: GeneradorAleatorio;
}

export const CARTAS: readonly Carta[] = [
  {
    palabra: "PUPUSA",
    prohibidas: ["Maiz", "queso", "curtido", "comal", "frijoles"],
  },
  {
    palabra: "CHILATE",
    prohibidas: ["bebida", "maíz", "cacao", "tomar", "caliente"],
  },
  {
    palabra: "CANTÓN",
    prohibidas: ["campo", "rural", "caserío", "pueblo", "casas"],
  },
  {
    palabra: "CELULAR",
    prohibidas: ["teléfono", "llamar", "pantalla", "móvil", "mensaje"],
  },
  {
    palabra: "SEMÁFORO",
    prohibidas: ["rojo", "verde", "calle", "luz", "carro"],
  },
  {
    palabra: "VOLCÁN",
    prohibidas: ["montaña", "lava", "erupción", "fuego", "cráter"],
  },
  {
    palabra: "MERCADO",
    prohibidas: ["comprar", "vender", "puesto", "tienda", "frutas"],
  },
];

export function crearGeneradorAleatorio(semilla: number): GeneradorAleatorio {
  if (!Number.isFinite(semilla)) {
    throw new TypeError("La semilla debe ser un número finito.");
  }

  let valor = Math.trunc(semilla) >>> CONFIG.DESPLAZAMIENTO_NORMALIZACION;
  if (valor === CONFIG.SEMILLA_CERO) {
    valor = CONFIG.SEMILLA_ALTERNATIVA;
  }

  return () => {
    valor ^= valor << CONFIG.DESPLAZAMIENTO_IZQUIERDA_UNO;
    valor ^= valor >>> CONFIG.DESPLAZAMIENTO_DERECHA;
    valor ^= valor << CONFIG.DESPLAZAMIENTO_IZQUIERDA_DOS;
    return (valor >>> CONFIG.DESPLAZAMIENTO_NORMALIZACION) / CONFIG.RANGO_UINT32;
  };
}

function mezclarCartas(cartas: readonly Carta[], aleatorio: GeneradorAleatorio): Carta[] {
  const mezcladas = [...cartas];

  for (
    let indice = mezcladas.length - CONFIG.PASO_INDICE;
    indice > CONFIG.INDICE_INICIAL;
    indice -= CONFIG.PASO_INDICE
  ) {
    const indiceAleatorio = Math.floor(aleatorio() * (indice + CONFIG.PASO_INDICE));
    [mezcladas[indice], mezcladas[indiceAleatorio]] = [
      mezcladas[indiceAleatorio],
      mezcladas[indice],
    ];
  }

  return mezcladas;
}

export function crearEstadoInicial(semilla: number): EstadoJuego {
  if (
    CARTAS.length < CONFIG.CARTAS_MINIMAS ||
    CARTAS.length > CONFIG.CARTAS_MAXIMAS
  ) {
    throw new Error("La cantidad de cartas no cumple los límites configurados.");
  }

  return {
    fase: "sin_empezar",
    resultado: null,
    cartaActual: null,
    aciertos: CONFIG.INDICE_INICIAL,
    faltas: CONFIG.INDICE_INICIAL,
    segundosRestantes: CONFIG.DURACION_RONDA_SEGUNDOS,
    mazo: [],
    cartasUsadas: [],
    generarAleatorio: crearGeneradorAleatorio(semilla),
  };
}

function sacarSiguienteCarta(estado: EstadoJuego): void {
  const cartaAnterior = estado.cartaActual;
  if (cartaAnterior !== null) {
    estado.cartasUsadas.push(cartaAnterior);
  }

  if (estado.mazo.length === CONFIG.INDICE_INICIAL) {
    const cartasParaRevolver = estado.cartasUsadas.filter(
      (carta) => carta !== cartaAnterior,
    );
    estado.mazo = mezclarCartas(cartasParaRevolver, estado.generarAleatorio);
    estado.cartasUsadas = [];
  }

  const siguiente = estado.mazo.shift();
  if (siguiente === undefined) {
    throw new Error("No hay cartas disponibles para continuar la ronda.");
  }

  estado.cartaActual = siguiente;
}

export function empezarRonda(estado: EstadoJuego): boolean {
  estado.fase = "en_curso";
  estado.resultado = null;
  estado.aciertos = CONFIG.INDICE_INICIAL;
  estado.faltas = CONFIG.INDICE_INICIAL;
  estado.segundosRestantes = CONFIG.DURACION_RONDA_SEGUNDOS;
  estado.cartasUsadas = [];
  estado.mazo = mezclarCartas(CARTAS.slice(CONFIG.PASO_INDICE), estado.generarAleatorio);
  estado.cartaActual = CARTAS[CONFIG.INDICE_INICIAL];
  return true;
}

export function acertarPalabra(estado: EstadoJuego): boolean {
  if (estado.fase !== "en_curso") {
    return false;
  }

  estado.aciertos += CONFIG.PASO_INDICE;
  sacarSiguienteCarta(estado);

  if (estado.aciertos >= CONFIG.ACIERTOS_PARA_GANAR) {
    estado.fase = "ganada";
    estado.resultado = "ganaron";
  }

  return true;
}

export function marcarFalta(estado: EstadoJuego): boolean {
  if (estado.fase !== "en_curso") {
    return false;
  }

  estado.faltas += CONFIG.PASO_INDICE;
  sacarSiguienteCarta(estado);

  if (estado.faltas >= CONFIG.FALTAS_PARA_PERDER) {
    estado.fase = "perdida";
    estado.resultado = "tres_faltas";
  }

  return true;
}

export function actualizarTiempo(
  estado: EstadoJuego,
  segundosTranscurridos: number,
): boolean {
  if (
    estado.fase !== "en_curso" ||
    !Number.isFinite(segundosTranscurridos) ||
    segundosTranscurridos < CONFIG.INDICE_INICIAL
  ) {
    return false;
  }

  estado.segundosRestantes = Math.max(
    CONFIG.INDICE_INICIAL,
    estado.segundosRestantes - segundosTranscurridos,
  );

  if (estado.segundosRestantes === CONFIG.INDICE_INICIAL) {
    estado.fase = "perdida";
    estado.resultado = "tiempo_agotado";
  }

  return true;
}

export function quedanPocosSegundos(estado: EstadoJuego): boolean {
  return (
    estado.fase === "en_curso" &&
    estado.segundosRestantes < CONFIG.SEGUNDOS_PARA_ALERTA
  );
}
