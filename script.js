// variables globales
let operacionActual = '';
let ultimoResultado = 0;
let baseDatosInicializada = false;
let musicaSonando = false;
let db;

// elementos del dom
const pantalla = document.getElementById('pantalla');
const botones = document.querySelectorAll('.boton');
const botonTema = document.getElementById('botonTema');
const botonMusica = document.getElementById('botonMusica');
const controlVolumen = document.getElementById('volumen');
const sonidoTecla = document.getElementById('sonidoTecla');
const sonidoError = document.getElementById('sonidoError');
const musicaFondo = document.getElementById('musicaFondo');
const borrarHistorialBtn = document.getElementById('borrarHistorial');
const listaHistorial = document.getElementById('listaHistorial');

// iniciar la base de datos
function iniciarBaseDatos() {
    // checkear si el navegador soporta indexeddb
    if (!window.indexedDB) {
        console.log("tu navegador no soporta indexeddb, usando localstorage");
        return false;
    }
    
    const solicitud = window.indexedDB.open("calculadoraBD", 1);
    
    solicitud.onerror = function(evento) {
        console.log("error al abrir bd:", evento.target.errorCode);
        return false;
    };
    
    solicitud.onupgradeneeded = function(evento) {
        db = evento.target.result;
        // crear tabla historial
        if (!db.objectStoreNames.contains('historial')) {
            const objectStore = db.createObjectStore('historial', { keyPath: 'id', autoIncrement: true });
            objectStore.createIndex('operacion', 'operacion', { unique: false });
            objectStore.createIndex('resultado', 'resultado', { unique: false });
            objectStore.createIndex('fecha', 'fecha', { unique: false });
        }
    };
    
    solicitud.onsuccess = function(evento) {
        db = evento.target.result;
        baseDatosInicializada = true;
        cargarHistorial();
    };
}

// cargar historial de la bd
function cargarHistorial() {
    if (!baseDatosInicializada) return;
    
    listaHistorial.innerHTML = '';
    
    const transaction = db.transaction(['historial'], 'readonly');
    const objectStore = transaction.objectStore('historial');
    const request = objectStore.getAll();
    
    request.onsuccess = function(evento) {
        const operaciones = evento.target.result;
        
        // mostrar solo las ultimas 5 operaciones
        const ultimasOperaciones = operaciones.slice(-5);
        
        ultimasOperaciones.forEach(item => {
            const elemento = document.createElement('p');
            elemento.textContent = `${item.operacion} = ${item.resultado}`;
            listaHistorial.appendChild(elemento);
        });
    };
}

// guardar operacion en la bd
function guardarOperacion(operacion, resultado) {
    // si no hay bd, guardamos en localstorage
    if (!baseDatosInicializada) {
        const historial = JSON.parse(localStorage.getItem('calculadoraHistorial') || '[]');
        historial.push({ operacion, resultado, fecha: new Date() });
        if (historial.length > 10) historial.shift(); // mantener solo las ultimas 10
        localStorage.setItem('calculadoraHistorial', JSON.stringify(historial));
        return;
    }
    
    const transaction = db.transaction(['historial'], 'readwrite');
    const objectStore = transaction.objectStore('historial');
    
    const nuevoRegistro = {
        operacion: operacion,
        resultado: resultado,
        fecha: new Date()
    };
    
    objectStore.add(nuevoRegistro);
    
    transaction.oncomplete = function() {
        cargarHistorial();
    };
}

// borrar el historial
function borrarHistorialCompleto() {
    if (!baseDatosInicializada) {
        localStorage.removeItem('calculadoraHistorial');
        listaHistorial.innerHTML = '';
        return;
    }
    
    const transaction = db.transaction(['historial'], 'readwrite');
    const objectStore = transaction.objectStore('historial');
    const request = objectStore.clear();
    
    request.onsuccess = function() {
        listaHistorial.innerHTML = '';
        reproducirSonido(sonidoTecla);
    };
}

// reproducir sonido
function reproducirSonido(elemento) {
    elemento.volume = controlVolumen.value;
    elemento.currentTime = 0;
    elemento.play().catch(error => console.log("error al reproducir sonido", error));
}

// cambiar tema oscuro/claro
function cambiarTema() {
    const body = document.body;
    body.classList.toggle('modo-oscuro');
    
    const icono = botonTema.querySelector('i');
    if (body.classList.contains('modo-oscuro')) {
        icono.className = 'fas fa-sun';
        localStorage.setItem('tema', 'oscuro');
    } else {
        icono.className = 'fas fa-moon';
        localStorage.setItem('tema', 'claro');
    }
    
    reproducirSonido(sonidoTecla);
}

// controlar la musica
function controlarMusica() {
    if (musicaSonando) {
        musicaFondo.pause();
        botonMusica.querySelector('i').style.color = '';
    } else {
        musicaFondo.volume = controlVolumen.value;
        musicaFondo.play().catch(error => console.log("error al reproducir musica", error));
        botonMusica.querySelector('i').style.color = '#ff9500';
    }
    musicaSonando = !musicaSonando;
}

// limpiar pantalla
function limpiarPantalla() {
    operacionActual = '';
    pantalla.textContent = '0';
    reproducirSonido(sonidoTecla);
}

// borrar ultimo caracter
function borrarUltimo() {
    if (operacionActual.length > 0) {
        operacionActual = operacionActual.slice(0, -1);
        pantalla.textContent = operacionActual || '0';
    }
    reproducirSonido(sonidoTecla);
}

// procesar boton cientifico
function procesarFuncionCientifica(valor) {
    switch(valor) {
        case 'sin(':
            operacionActual += 'Math.sin(';
            break;
        case 'cos(':
            operacionActual += 'Math.cos(';
            break;
        case 'tan(':
            operacionActual += 'Math.tan(';
            break;
        case 'log(':
            operacionActual += 'Math.log10(';
            break;
        case 'ln(':
            operacionActual += 'Math.log(';
            break;
        case 'sqrt(':
            operacionActual += 'Math.sqrt(';
            break;
        default:
            operacionActual += valor;
    }
    
    pantalla.textContent = operacionActual;
}

// calcular resultado
function calcular() {
    try {
        // reemplazar x por *
        let expresion = operacionActual.replace(/×/g, '*');
        
        // evaluar la expresion
        let resultado = eval(expresion);
        
        // verificar si es un numero valido
        if (isNaN(resultado) || !isFinite(resultado)) {
            throw new Error("resultado invalido");
        }
        
        // redondear para evitar problemas de precision
        resultado = parseFloat(resultado.toFixed(10));
        
        guardarOperacion(operacionActual, resultado);
        ultimoResultado = resultado;
        
        // actualizar pantalla
        pantalla.textContent = resultado;
        operacionActual = resultado.toString();
        
        reproducirSonido(sonidoTecla);
        
    } catch (error) {
        pantalla.textContent = "Error";
        reproducirSonido(sonidoError);
        setTimeout(() => {
            pantalla.textContent = operacionActual || '0';
        }, 1000);
    }
}

// agregar valores a la operacion actual
function agregarValor(valor) {
    if (pantalla.textContent === '0' && valor !== '.') {
        operacionActual = valor;
    } else if (pantalla.textContent === 'Error') {
        operacionActual = valor;
    } else {
        operacionActual += valor;
    }
    
    pantalla.textContent = operacionActual;
    reproducirSonido(sonidoTecla);
}

// eventos de los botones
botones.forEach(boton => {
    boton.addEventListener('click', () => {
        const valor = boton.getAttribute('data-valor');
        
        if (valor === 'C') {
            limpiarPantalla();
        } else if (valor === 'CE') {
            borrarUltimo();
        } else if (valor === '=') {
            calcular();
        } else if (valor === 'ANS') {
            operacionActual += ultimoResultado.toString();
            pantalla.textContent = operacionActual;
            reproducirSonido(sonidoTecla);
        } else if (boton.classList.contains('cientifico')) {
            procesarFuncionCientifica(valor);
        } else {
            agregarValor(valor);
        }
    });
});

// evento para cambiar tema
botonTema.addEventListener('click', cambiarTema);

// evento para controlar musica
botonMusica.addEventListener('click', controlarMusica);

// evento para cambiar volumen
controlVolumen.addEventListener('input', () => {
    sonidoTecla.volume = controlVolumen.value;
    sonidoError.volume = controlVolumen.value;
    musicaFondo.volume = controlVolumen.value;
});

// evento para borrar historial
borrarHistorialBtn.addEventListener('click', borrarHistorialCompleto);

// cargar preferencias guardadas
window.addEventListener('load', () => {
    // iniciar base de datos
    iniciarBaseDatos();
    
    // cargar tema guardado
    const temaGuardado = localStorage.getItem('tema');
    if (temaGuardado === 'oscuro') {
        cambiarTema();
    }
    
    // evento para teclas del teclado
    document.addEventListener('keydown', (evento) => {
        const tecla = evento.key;
        
        // numeros y operadores
        if (/[\d\+\-\*\/\.\(\)%=]/.test(tecla)) {
            evento.preventDefault();
            if (tecla === '=') {
                calcular();
            } else if (tecla === '*') {
                agregarValor('*');
            } else {
                agregarValor(tecla);
            }
        } else if (tecla === 'Enter') {
            evento.preventDefault();
            calcular();
        } else if (tecla === 'Backspace') {
            evento.preventDefault();
            borrarUltimo();
        } else if (tecla === 'Escape') {
            evento.preventDefault();
            limpiarPantalla();
        }
    });
});