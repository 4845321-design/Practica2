import "./estilo.css";
import {
  CONFIG,
  actualizarTiempo,
  acertarPalabra,
  crearEstadoInicial,
  empezarRonda,
  quedanPocosSegundos,
  marcarFalta,
} from "./logica";

const app = document.querySelector<HTMLDivElement>("#app");
if (app === null) {
  throw new Error('No se encontró el contenedor de la aplicación "#app".');
}

const estado = crearEstadoInicial(2026);
let temporizador: number | null = null;

function detenerTemporizador(): void {
  if (temporizador !== null) {
    window.clearInterval(temporizador);
    temporizador = null;
  }
}

function sincronizarTemporizador(): void {
  if (estado.fase !== "en_curso") {
    detenerTemporizador();
  }
}

function formatoTiempo(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const segundosRestantes = Math.floor(segundos % 60);
  return `${minutos}:${String(segundosRestantes).padStart(2, "0")}`;
}

function vistaInicio(): string {
  return `
    <main class="panel panel-inicio" aria-labelledby="titulo">
      <p class="sobrelinea">Un juego para dos, en un solo celular</p>
      <h1 id="titulo">La Palabra Prohibida</h1>
      <p class="introduccion">
        Describe la palabra sin decir ninguna de las cinco prohibidas.
        La otra persona tiene ${CONFIG.DURACION_RONDA_SEGUNDOS} segundos para adivinar
        ${CONFIG.ACIERTOS_PARA_GANAR} palabras.
      </p>
      <button class="boton boton-inicio" type="button" data-accion="empezar">
        Empezar
      </button>
      <p class="ayuda-teclado">
        También puedes empezar o reiniciar con <kbd>Enter</kbd>.
      </p>
    </main>
  `;
}

function vistaRonda(): string {
  const carta = estado.cartaActual;
  if (carta === null) {
    throw new Error("La ronda está en curso, pero no hay una carta actual.");
  }

  const alertaTiempo = quedanPocosSegundos(estado);
  return `
    <main class="panel panel-ronda" aria-labelledby="titulo">
      <header class="encabezado-ronda">
        <div>
          <p class="sobrelinea">La Palabra Prohibida</p>
          <h1 id="titulo">¡A describir!</h1>
        </div>
        <p class="temporizador${alertaTiempo ? " temporizador-alerta" : ""}"
           role="timer" aria-label="Tiempo restante">
          ${formatoTiempo(estado.segundosRestantes)}
        </p>
      </header>

      <section class="tarjeta" aria-labelledby="palabra">
        <p class="etiqueta">Tu palabra</p>
        <h2 id="palabra">${carta.palabra}</h2>
        <p class="etiqueta etiqueta-prohibidas">No digas estas palabras</p>
        <ul class="lista-prohibidas">
          ${carta.prohibidas.map((palabra) => `<li>${palabra}</li>`).join("")}
        </ul>
      </section>

      <section class="marcador" aria-label="Marcador de la ronda">
        <p class="marcador-aciertos">
          <span>Aciertos</span>
          <strong>${estado.aciertos}/${CONFIG.ACIERTOS_PARA_GANAR}</strong>
        </p>
        <p class="marcador-faltas">
          <span>Faltas</span>
          <strong>${estado.faltas}/${CONFIG.FALTAS_PARA_PERDER}</strong>
        </p>
      </section>

      <div class="acciones" aria-label="Acciones del juego">
        <button class="boton boton-acierto" type="button" data-accion="acertar">
          ¡Acertó!
          <span class="ayuda-teclado">Espacio</span>
        </button>
        <button class="boton boton-falta" type="button" data-accion="falta">
          Dijo una prohibida
          <span class="ayuda-teclado">Tecla F</span>
        </button>
      </div>
    </main>
  `;
}

function vistaFinal(): string {
  const gano = estado.resultado === "ganaron";
  let mensajeFinal: string;

  if (gano) {
    mensajeFinal = "¡Ganaron!";
  } else if (estado.resultado === "tiempo_agotado") {
    mensajeFinal = "Se acabó el tiempo";
  } else {
    mensajeFinal = `Llegaron a ${CONFIG.FALTAS_PARA_PERDER} faltas`;
  }

  return `
    <main class="panel panel-final${gano ? " panel-final-ganado" : " panel-final-perdido"}"
          aria-labelledby="titulo" aria-live="polite">
      <p class="sobrelinea">La ronda terminó</p>
      <h1 id="titulo">${mensajeFinal}</h1>
      <p class="resultado">
        Adivinaron <strong>${estado.aciertos}/${CONFIG.ACIERTOS_PARA_GANAR}</strong>
        palabras.
      </p>
      <p class="resultado-faltas">
        Faltas: <strong>${estado.faltas}/${CONFIG.FALTAS_PARA_PERDER}</strong>
      </p>
      <button class="boton boton-inicio" type="button" data-accion="empezar">
        Jugar de nuevo
      </button>
      <p class="ayuda-teclado">
        También puedes reiniciar con <kbd>Enter</kbd>.
      </p>
    </main>
  `;
}

function renderizar(): void {
  sincronizarTemporizador();

  if (estado.fase === "sin_empezar") {
    app.innerHTML = vistaInicio();
  } else if (estado.fase === "en_curso") {
    app.innerHTML = vistaRonda();
  } else {
    app.innerHTML = vistaFinal();
  }
}

function iniciarRonda(): void {
  if (empezarRonda(estado)) {
    detenerTemporizador();
    renderizar();
    temporizador = window.setInterval(() => {
      if (actualizarTiempo(estado, 1)) {
        renderizar();
      } else {
        detenerTemporizador();
      }
    }, 1000);
  }
}

function ejecutarAccion(accion: "acertar" | "falta"): void {
  const accionValida =
    accion === "acertar" ? acertarPalabra(estado) : marcarFalta(estado);

  if (accionValida) {
    renderizar();
  }
}

app.addEventListener("click", (evento: MouseEvent) => {
  const objetivo = evento.target;
  if (!(objetivo instanceof Element)) {
    return;
  }

  const boton = objetivo.closest<HTMLButtonElement>("[data-accion]");
  if (boton === null) {
    return;
  }

  const accion = boton.dataset.accion;
  if (accion === "empezar") {
    iniciarRonda();
  } else if (accion === "acertar" || accion === "falta") {
    ejecutarAccion(accion);
  }
});

document.addEventListener("keydown", (evento: KeyboardEvent) => {
  if (evento.repeat) {
    return;
  }

  if (evento.key === "Enter") {
    if (estado.fase !== "en_curso") {
      iniciarRonda();
      evento.preventDefault();
    }
    return;
  }

  if (evento.code === "Space") {
    evento.preventDefault();
    ejecutarAccion("acertar");
  } else if (evento.key.toLowerCase() === "f") {
    ejecutarAccion("falta");
  }
});

renderizar();
