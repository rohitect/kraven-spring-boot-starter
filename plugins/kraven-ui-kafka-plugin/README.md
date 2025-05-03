# Kraven UI Kafka Plugin

<p align="center">
  <img src="../../docs/screenshots/kraven_kafka_explorer.png" alt="Kraven UI Kafka Explorer" width="800">
</p>

## 🚀 Overview

The Kraven UI Kafka Plugin is a powerful extension for the Kraven UI library that provides comprehensive Kafka management capabilities directly within your application. No more switching between tools or using external Kafka management interfaces - everything you need is right here in your application.

Manage your Kafka clusters with ease:

- **Topic Browser**: View all topics and their configurations
- **Message Producer**: Send messages to topics with a simple UI
- **Message Consumer**: View messages in topics with filtering and pagination
- **Live Streaming**: Watch messages arrive in real-time
- **Consumer Group Monitoring**: Track consumer groups and their lag
- **Partition Details**: View detailed partition information
- **Smart Loading**: Features a sarcastic, funny loading animation when refreshing the page

## ✨ Features

### 🔍 Topic Management
- **Browse Topics**: View all topics in your Kafka clusters
- **Topic Details**: See detailed information about each topic including partitions, replication factor, and configuration
- **Create Topics**: Create new topics with custom configurations
- **Delete Topics**: Remove topics that are no longer needed
- **Topic Configuration**: View and modify topic configurations

### 📤 Message Production
- **User-friendly Interface**: Send messages to topics with a clean, intuitive interface
- **JSON Validation**: Validate JSON messages before sending
- **Headers Support**: Add custom headers to your messages
- **Key-Value Support**: Specify both keys and values for your messages
- **Batch Sending**: Send multiple messages at once

### 📥 Message Consumption
- **Browse Messages**: View messages in topics with pagination
- **Filtering**: Filter messages by key, value, or headers
- **JSON Formatting**: Automatic formatting of JSON messages
- **Timestamp Display**: See when messages were produced
- **Offset Information**: View offset information for each message

### 📺 Live Streaming
- **Real-time Updates**: Watch messages arrive in real-time
- **Auto-scrolling**: Automatically scroll to new messages
- **Pause/Resume**: Pause streaming when needed
- **Filtering**: Filter streamed messages by content

### 👥 Consumer Group Monitoring
- **Group Overview**: See all consumer groups in your cluster
- **Lag Monitoring**: Track consumer lag for each group
- **Member Details**: View detailed information about group members
- **Offset Management**: Reset offsets for consumer groups

### 🔎 Listener Discovery
- **Automatic Detection**: Automatically discovers `@KafkaListener` annotations in your application
- **Method Details**: See which methods are listening to which topics
- **Configuration Display**: View listener configurations

### 🔄 Smart Loading
- **Sarcastic Loading**: Features a sarcastic, funny loading animation when refreshing the page
- **Plugin Registration**: Waits for plugin registration to complete before loading the UI
- **Error Handling**: Gracefully handles plugin registration failures

## 🛠️ Installation

### Maven

Add the Kafka plugin to your project:

```xml
<dependency>
    <groupId>io.github.rohitect</groupId>
    <artifactId>kraven-ui-kafka-plugin</artifactId>
    <version>1.0.6</version>
</dependency>
```

### Gradle

```groovy
implementation 'io.github.rohitect:kraven-ui-kafka-plugin:1.0.6'
```

## ⚙️ Configuration

Configure the Kafka plugin in your `application.properties` or `application.yml`:

```properties
# Enable the plugin system
kraven.ui.plugins.enabled=true

# Enable the Kafka plugin
kraven.ui.kafka.enabled=true

# Configure message browsing
kraven.ui.kafka.message-limit=100

# Enable/disable streaming
kraven.ui.kafka.streaming-enabled=true

# Enable/disable message production
kraven.ui.kafka.message-production-enabled=true

# Enable/disable message consumption
kraven.ui.kafka.message-consumption-enabled=true

# Configure Kafka clusters (optional - will use Spring Kafka's configuration by default)
kraven.ui.kafka.clusters[0].id=local
kraven.ui.kafka.clusters[0].name=Local Cluster
kraven.ui.kafka.clusters[0].bootstrapServers=localhost:9092
```

## 🔌 Integration with Spring Kafka

The Kafka plugin integrates seamlessly with Spring Kafka:

- **Auto-configuration**: Uses Spring Kafka's configuration by default
- **Listener Discovery**: Automatically discovers `@KafkaListener` annotations
- **Producer Integration**: Uses Spring Kafka's producer for sending messages
- **Consumer Integration**: Uses Spring Kafka's consumer for browsing messages

## 🧩 Architecture

The Kafka plugin follows a modular architecture:

- **Frontend**: Angular components for the Kafka Explorer UI
- **Backend**: Spring controllers and services for Kafka operations
- **Plugin Registration**: Automatically registers with the Kraven UI core
- **API**: RESTful API for Kafka operations

### Component Diagram

```
┌─────────────────────────┐
│   Kraven UI Frontend    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Kafka Plugin Frontend  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Kraven UI Backend     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Kafka Plugin Backend   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      Spring Kafka       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│     Kafka Cluster       │
└─────────────────────────┘
```

## 🔒 Security

The Kafka plugin inherits security from your application:

- **Authentication**: Uses your application's authentication mechanism
- **Authorization**: Respects your application's authorization rules
- **TLS**: Supports TLS for secure communication with Kafka
- **SASL**: Supports SASL authentication mechanisms

## 🧪 Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/rohitect/kraven.git
cd kraven

# Build the plugin SDK
cd kraven-ui-plugin-sdk
mvn clean install

# Build the Kafka plugin
cd ../plugins/kraven-ui-kafka-plugin
mvn clean package
```

### Creating a Bundle

Use the provided script to create a bundle:

```bash
./bundle-kafka-plugin.sh
```

This will create:
- A standard bundle in `dist/plugins/kafka`
- A Maven bundle in `dist/maven-bundles`

## 📚 API Reference

The Kafka plugin exposes the following API endpoints:

- `GET /kraven/plugin/kafka/clusters` - Get all Kafka clusters
- `GET /kraven/plugin/kafka/clusters/{clusterId}/topics` - Get all topics in a cluster
- `GET /kraven/plugin/kafka/clusters/{clusterId}/topics/{topicName}` - Get topic details
- `POST /kraven/plugin/kafka/clusters/{clusterId}/topics` - Create a new topic
- `DELETE /kraven/plugin/kafka/clusters/{clusterId}/topics/{topicName}` - Delete a topic
- `GET /kraven/plugin/kafka/clusters/{clusterId}/topics/{topicName}/messages` - Get messages from a topic
- `POST /kraven/plugin/kafka/clusters/{clusterId}/topics/{topicName}/messages` - Send a message to a topic
- `GET /kraven/plugin/kafka/clusters/{clusterId}/consumer-groups` - Get all consumer groups
- `GET /kraven/plugin/kafka/clusters/{clusterId}/consumer-groups/{groupId}` - Get consumer group details
- `GET /kraven/plugin/kafka/listeners` - Get all Kafka listeners in the application

## 🤝 Contributing

Contributions are welcome! Here's how you can contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## 📜 License

MIT License - See the [LICENSE](../../LICENSE) file for details.

## 🙏 Acknowledgements

- [Spring Kafka](https://spring.io/projects/spring-kafka) - For the excellent Kafka integration
- [Apache Kafka](https://kafka.apache.org/) - For being an awesome distributed streaming platform
- [Angular](https://angular.io/) - For the frontend framework
- [Spring Boot](https://spring.io/projects/spring-boot) - For making Java development enjoyable again
