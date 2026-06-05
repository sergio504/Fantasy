import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import json
import re
import time

BASE_URL = 'https://www.lapreferente.com'

POSICIONES_MAP = {
    'portero': 'PORTERO',
    'guardameta': 'PORTERO',

    'central': 'DEFENSA',
    'lateral': 'DEFENSA',
    'lateral derecho': 'DEFENSA',
    'lateral izquierdo': 'DEFENSA',
    'defensa': 'DEFENSA',
    'defensa central': 'DEFENSA',
    'defensa derecho': 'DEFENSA',
    'defensa izquierdo': 'DEFENSA',
    'carrilero': 'DEFENSA',

    'centrocampista': 'CENTROCAMPISTA',
    'mediocampista': 'CENTROCAMPISTA',
    'mediocentro': 'CENTROCAMPISTA',
    'mediocampo': 'CENTROCAMPISTA',
    'pivote': 'CENTROCAMPISTA',
    'interior': 'CENTROCAMPISTA',
    'medio': 'CENTROCAMPISTA',
    'medio centro': 'CENTROCAMPISTA',
    'mediocentro defensivo': 'CENTROCAMPISTA',
    'mediocentro ofensivo': 'CENTROCAMPISTA',
    'mediapunta': 'CENTROCAMPISTA',
    'enganche': 'CENTROCAMPISTA',

    'delantero': 'DELANTERO',
    'delantero centro': 'DELANTERO',
    'extremo': 'DELANTERO',
    'extremo derecho': 'DELANTERO',
    'extremo izquierdo': 'DELANTERO',
    'punta': 'DELANTERO',
    'ariete': 'DELANTERO',
    'segunda punta': 'DELANTERO',
}

def normalizar_posicion(posicion_raw):
    clave = posicion_raw.strip().lower()
    if clave in POSICIONES_MAP:
        return POSICIONES_MAP[clave]
    for k, v in POSICIONES_MAP.items():
        if k in clave or clave in k:
            return v
    return 'UNKNOWN'

def extraer_equipos_del_selector(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    }

    response = requests.get(url, headers=headers)
    response.raise_for_status()

    soup = BeautifulSoup(response.content, 'html.parser')

    selector = soup.find('div', id='selectorEquipos')
    if not selector:
        print('[!] No se encontró el div#selectorEquipos')
        return []

    equipos = []
    for td in selector.find_all('td'):
        a = td.find('a')
        if not a:
            continue

        href = a.get('href', '').strip()
        if not href:
            continue

        # Nombre desde onmouseover: innerHTML=':: NOMBRE EQUIPO ::'
        onmouseover = td.get('onmouseover', '')
        match = re.search(r"innerHTML=':: (.+?) ::'", onmouseover)
        if match:
            nombre = match.group(1).strip().title()
        else:
            nombre = href.split('/')[-1].replace('-', ' ').title()

        url_equipo = urljoin(BASE_URL, href)
        equipos.append({'nombre': nombre, 'url': url_equipo})

    return equipos

def extraer_jugadores(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    }

    response = requests.get(url, headers=headers)
    response.raise_for_status()

    soup = BeautifulSoup(response.content, 'html.parser')

    tabla = soup.find('table', id='tablePlantilla')
    if not tabla:
        print(f'  [!] No se encontró la tabla en {url}')
        return []

    jugadores = []

    for fila in tabla.find_all('tr'):
        tds = fila.find_all('td')
        if len(tds) < 4:
            continue

        nombreCompleto = None
        nombre = None
        dorsal = None
        posicion = None
        edad = None

        # Dorsal: 2º td (índice 1)
        texto = tds[1].get_text(strip=True)
        if texto.isdigit():
            dorsal = int(texto)

        # Nombre: 3er td (índice 2)
        a = tds[2].find('a')
        if a:
            spans = a.find_all('span')
            if len(spans) >= 2:
                nombre = spans[0].get_text(strip=True)
                nombreCompleto = spans[1].get_text(strip=True)
            elif len(spans) == 1:
                nombre = spans[0].get_text(strip=True)
                nombreCompleto = nombre

        # Posicion: 4º td (índice 3)
        span = tds[3].find('span')
        if span:
            posicion = span.get_text(strip=True)

        # Edad: 6º td (índice 5)
        if len(tds) > 5:
            span = tds[5].find('span')
            if span:
                texto = span.get_text(strip=True)
                if texto.isdigit():
                    edad = int(texto)

        if nombreCompleto:
            jugadores.append({
                'nombreCompleto': nombreCompleto,
                'nombre': nombre or nombreCompleto,
                'dorsal': dorsal,
                'edad': edad,
                'posicion': normalizar_posicion(posicion) if posicion else 'UNKNOWN',
            })

    return jugadores


if __name__ == '__main__':
    URL_INICIO   = 'https://www.lapreferente.com/E16067C22828-19/abanto-club'
    DIVISION     = 'HONOR_BIZKAIA'
    FICHERO_JSON = 'jugadores_honor_bizkaia.json'

    print('Buscando equipos en el selector...')
    equipos = extraer_equipos_del_selector(URL_INICIO)
    print(f'{len(equipos)} equipos encontrados\n')

    resultado = []

    for i, equipo in enumerate(equipos, 1):
        print(f'[{i}/{len(equipos)}] {equipo["nombre"]}')
        try:
            jugadores = extraer_jugadores(equipo['url'])
            print(f'  {len(jugadores)} jugadores')
            resultado.append({
                'equipo': {'nombre': equipo['nombre'], 'division': DIVISION},
                'jugadores': jugadores,
            })
        except Exception as e:
            print(f'  [!] Error: {e}')

        time.sleep(1)  # pausa para no saturar el servidor

    with open(FICHERO_JSON, 'w', encoding='utf-8') as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    total_jugadores = sum(len(e['jugadores']) for e in resultado)
    print(f'\nGuardados {total_jugadores} jugadores de {len(resultado)} equipos en {FICHERO_JSON}')
