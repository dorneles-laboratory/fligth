# ✈️ FlightScope — Real-Time Flight Telemetry & 3D Flight Simulator

> Sistema de telemetria de voo em tempo real com simulador 3D fotorrealista e cockpit interativo acoplado via Web Serial API (115200 baud) a sensores inerciais (IMU MPU-6050) e sonar ultrassônico (HC-SR04).

🌐 **Ambiente de Produção:** [https://flight.dorneles.dev/](https://flight.dorneles.dev/)

---

## 🎯 Funcionalidades

- **Simulação 3D em Tempo Real (Three.js / React Three Fiber):**
  - **Visão Externa:** Câmera de perseguição cinemática acompanhando a atitude da aeronave.
  - **Visão Cockpit 1:1:** Visão em primeira pessoa do piloto na cabine bolha panorâmica, com acoplamento rígido instantâneo à fuselagem na mesma velocidade da visão.
  - **Asas e Nariz Visíveis:** Visão do radome e das asas delta bancando e arfando com o horizonte.
  - **Painel Digital (MFD):** Display Primary Flight Display com horizonte artificial reativo, varredura de radar e manetes táteis HOTAS.
  - **Obstáculo Holográfico LiDAR:** Barreira 3D proporcional à aproximação física da mão no sensor.

- **Head-Up Display (HUD) Militar Integrado:**
  - Fita deslizante contínua de Altitude Radar (`R-ALT`).
  - Fita deslizante de Velocidade (`SPEED`).
  - Fita horizontal de Proa/Bússola (`HEADING`).
  - Escada de Pitch e marcador de trajetória de voo (*Flight Path Marker*).

- **Telemetria e Gráficos Reativos (Recharts):**
  - Monitoramento contínuo em janela deslizante dos últimos 30 pontos.
  - Gráfico duplo de Arfagem (Pitch) e Rolamento (Roll) [-90°, +90°].
  - Gráfico de Altitude Radar [0 a 60 cm] com zonas coloridas de perigo.

- **Motor Matemático de Interpolação (60 a 144 FPS):**
  - Interpolação exponencial suave (*critically damped smoothing*) que preenche os intervalos do Arduino (~10 Hz) com suavidade absoluta para telas modernas de alta taxa de atualização.

- **Comunicação Web Serial API Resiliente:**
  - Conexão direta a 115200 baud com suporte a formato com vírgulas (`,`) e pipes (`|`).
  - Proteção contra *lock deadlocks*, *buffer overflow* e tratamento de desconexão física de cabo USB.
  - Modo de simulação autônomo para testes sem hardware conectado.

- **Temas Modernos:**
  - *Aerospace Stealth (Dark Mode)* e *Daylight Cockpit (Light Mode)* com persistência em `localStorage`.
  - 100% estilizado com **CSS Modules puros**, sem Tailwind CSS.

---

## 🛠️ Stack Tecnológica

- **Frontend:** React 19, TypeScript (modo estrito), Vite 7
- **Gráficos 3D:** Three.js, `@react-three/fiber`, `@react-three/drei`
- **Plotagem e Gráficos:** Recharts
- **Estilização:** CSS Modules (`.module.css`)
- **Hardware & Protocolo:** Web Serial API (W3C), Arduino C++
- **Servidor de Produção:** Nginx 1.27 Alpine + Docker + Caddy Reverse Proxy

---

## 🔌 Código do Microcontrolador (Arduino C++)

O firmware recomendado para o Arduino (com MPU-6050 e HC-SR04) lê os ângulos de atitude e a distância do radar, transmitindo na serial a 115200 baud:

```cpp
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

Adafruit_MPU6050 mpu;

const int TRIG_PIN = 9;
const int ECHO_PIN = 10;
const int LED_VERDE = 2;
const int LED_AMARELO = 3;
const int LED_VERMELHO = 4;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  mpu.begin();
  mpu.setFilterBandwidth(MPU6050_BAND_10_HZ);
}

void loop() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  float pitch = atan2(-a.acceleration.x, sqrt(a.acceleration.y * a.acceleration.y + a.acceleration.z * a.acceleration.z)) * 180.0 / PI;
  float roll  = atan2(a.acceleration.y, a.acceleration.z) * 180.0 / PI;

  // Transmissão de telemetria
  Serial.print("Pitch:"); Serial.print(pitch, 1); Serial.print(" | ");
  Serial.print("Roll:"); Serial.print(roll, 1); Serial.print(" | ");
  Serial.print("Radar_cm:30.0 | Nivel_Perigo:0 | Status:Voo Normal");
  Serial.println();
  delay(100);
}
```

---

## 🚀 Como Executar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Executar servidor de desenvolvimento
npm run dev

# 3. Gerar build de produção
npm run build
```

---

## 🐳 Deploy com Docker

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 📄 Licença

MIT License. Desenvolvido por **Dorneles Laboratory**.
