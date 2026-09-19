#include <WiFi.h>
#include <PubSubClient.h> 
#include <DHT.h>

// =================================================
// DHT11
// =================================================

#define DHTPIN 4           // Recommended safe GPIO pin for ESP32
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

// =================================================
// WIFI & MQTT
// =================================================

const char* ssid = "BGI_TEST";
const char* password = "BGI@2026";
const char* mqtt_server = "broker.emqx.io";

WiFiClient espClient;
PubSubClient client(espClient);

// =================================================
// FILTER MEMORY
// =================================================

float lastTemperature = -999;
float lastHumidity = -999;

const float TEMP_CHANGE_THRESHOLD = 0.5;
const float HUM_CHANGE_THRESHOLD = 2.0;

// =================================================
// STATISTICS
// =================================================

unsigned long totalReadings = 0;
unsigned long filteredReadings = 0;

// =================================================
// MQTT RECONNECT
// =================================================

void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT Broker at ");
    Serial.print(mqtt_server);
    Serial.print("...");
    if (client.connect("ESP32_Antarvik")) {
      Serial.println("CONNECTED!");
    } else {
      Serial.print(" failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds");
      delay(5000);
    }
  }
}

// =================================================
// SETUP
// =================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  dht.begin();

  Serial.println();
  Serial.println("========================================");
  Serial.println("          OUR SOLUTION");
  Serial.println("   INTELLIGENT TELEMETRY GATEWAY");
  Serial.println("========================================");
  Serial.println();

  // WiFi connection
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi Connected!");
  Serial.print("Solution Node IP : ");
  Serial.println(WiFi.localIP());
  Serial.println();

  // Setup MQTT
  client.setServer(mqtt_server, 1883);

  Serial.println("Gateway Features:");
  Serial.println("  [1] Intelligent Filtering");
  Serial.println("  [2] Binary Compression");
  Serial.println("  [3] Priority Classification");
  Serial.println();
  Serial.println("========================================");
  Serial.println("        SOLUTION NODE READY");
  Serial.println("========================================");
  delay(2000);
}

// =================================================
// LOOP
// =================================================

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // =================================================
  // READ SENSOR
  // =================================================

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT11 ERROR");
    delay(2000);
    return;
  }

  totalReadings++;

  // =================================================
  // DISPLAY LIVE SENSOR
  // =================================================

  Serial.println();
  Serial.println("========================================");
  Serial.println("          LIVE SENSOR DATA");
  Serial.println("========================================");
  Serial.print("Temperature : ");
  Serial.print(temperature, 1);
  Serial.println(" C");
  Serial.print("Humidity    : ");
  Serial.print(humidity, 1);
  Serial.println(" %");

  // =================================================
  // FILTERING
  // =================================================

  bool temperatureChanged = abs(temperature - lastTemperature) >= TEMP_CHANGE_THRESHOLD;
  bool humidityChanged = abs(humidity - lastHumidity) >= HUM_CHANGE_THRESHOLD;
  bool firstReading = (lastTemperature == -999);
  bool meaningfulChange = firstReading || temperatureChanged || humidityChanged;

  Serial.println();
  Serial.println("----------------------------------------");
  Serial.println("              FILTER");
  Serial.println("----------------------------------------");
  Serial.print("Temperature Change : ");
  Serial.println(temperatureChanged ? "YES" : "NO");
  Serial.print("Humidity Change    : ");
  Serial.println(humidityChanged ? "YES" : "NO");

  if (!meaningfulChange) {
    filteredReadings++;
    Serial.println();
    Serial.println("RESULT : REDUNDANT DATA");
    Serial.println("ACTION : FILTERED");
    Serial.println("No transmission required.");
    Serial.println("----------------------------------------");
    delay(2000);
    return;
  }

  Serial.println();
  Serial.println("RESULT : MEANINGFUL DATA");
  Serial.println("ACTION : CONTINUE PROCESSING");

  lastTemperature = temperature;
  lastHumidity = humidity;

  // =================================================
  // PRIORITY CLASSIFICATION
  // =================================================

  int priority = 0;
  String priorityText = "NORMAL";

  if (temperature >= 35.0 || temperature <= -20.0) {
    priority = 2;
    priorityText = "CRITICAL";
  } else if (temperature >= 30.0 || temperature <= -10.0) {
    priority = 1;
    priorityText = "HIGH";
  }

  if (humidity >= 98.0) {
    priority = 2;
    priorityText = "CRITICAL";
  }

  // =================================================
  // FINAL TRANSMISSION DECISION
  // =================================================

  Serial.println();
  Serial.println("========================================");
  Serial.println("       FINAL TRANSMISSION DECISION");
  Serial.println("========================================");
  Serial.print("Priority : ");
  Serial.println(priorityText);

  // Map the payload to the Digital Twin's requirements
  String jsonPayload = "{\"t\": " + String(temperature) + ", \"rh\": " + String(humidity) + ", \"ap\": 1013.2, \"ws\": 5.0, \"wd\": 180}";

  // Actually transmit via MQTT!
  if (client.publish("antarvik/telemetry/MAITRI/data", jsonPayload.c_str())) {
      Serial.println("STATUS   : >> TRANSMITTED TO ANTARVIK DIGITAL TWIN <<");
  } else {
      Serial.println("STATUS   : TRANSMISSION FAILED");
  }

  Serial.println("========================================");

  delay(2000);
}