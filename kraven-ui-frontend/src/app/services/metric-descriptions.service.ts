import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MetricDescriptionsService {
  private descriptions: { [key: string]: string } = {
    // Application Information
    'application-name': 'The name of the Spring Boot application as defined in the application properties or derived from the main class name.',
    'application-version': 'The version of the application as defined in the build file (pom.xml for Maven or build.gradle for Gradle).',
    'application-uptime': 'The amount of time the application has been running since it was started.',
    'application-profiles': 'Active Spring profiles that determine which configuration properties are being used.',
    
    // JVM Metrics
    'memory-usage': 'Shows the current memory usage of the JVM. This includes heap and non-heap memory currently being used by the application.',
    'heap-memory': 'Memory used for dynamic allocation of objects and JVM data structures. The JVM manages this memory area and performs garbage collection to free up unused objects.',
    'non-heap-memory': 'Memory used for the method area, JVM internal structures, and other native memory allocations. This includes Metaspace, Code Cache, and other non-heap areas.',
    'eden-space': 'Part of the young generation in the heap where objects are initially allocated. When Eden becomes full, a minor garbage collection occurs.',
    'survivor-space': 'Areas where objects that survive Eden Space garbage collections are moved. There are typically two survivor spaces, and objects move between them during minor GCs.',
    'old-gen': 'Area where long-lived objects are stored after surviving multiple garbage collections in the young generation. Major GC (full GC) occurs when this space fills up.',
    'metaspace': 'Area where class metadata is stored. Replaced PermGen in Java 8 and later versions. Grows automatically by default.',
    'code-cache': 'Area where JIT-compiled code is stored. Used by the JVM to optimize frequently executed code.',
    'compressed-class-space': 'Part of Metaspace used for compressed class pointers when UseCompressedOops is enabled.',
    'java-version': 'The version of Java being used to run the application.',
    'threads': 'The current number of live threads in the JVM, including both daemon and non-daemon threads.',
    'classes': 'Information about loaded, unloaded, and total classes in the JVM.',
    'operating-system': 'Details about the operating system where the application is running.',
    'processors': 'The number of available processors to the JVM.',
    
    // Garbage Collector Metrics
    'garbage-collectors': 'Information about the garbage collectors running in the JVM, including collection counts and times.',
    'gc-collections': 'The number of times the garbage collector has run.',
    'gc-time': 'The total time spent performing garbage collection operations.',
    
    // Spring Metrics
    'beans': 'The total number of Spring beans in the application context.',
    'controllers': 'The number of @Controller or @RestController annotated classes.',
    'services': 'The number of @Service annotated classes.',
    'repositories': 'The number of @Repository annotated classes.',
    'components': 'The number of @Component annotated classes (excluding controllers, services, and repositories).',
    'configurations': 'The number of @Configuration annotated classes.',
    'endpoints': 'The number of Spring MVC or WebFlux endpoints.',
    
    // Kafka Metrics
    'topics': 'The number of Kafka topics available to the application.',
    'consumers': 'The number of Kafka consumers in the application.',
    'producers': 'The number of Kafka producers in the application.',
    'listeners': 'The number of @KafkaListener annotated methods in the application.',
    
    // Feign Client Metrics
    'feign-clients': 'The number of Feign clients in the application.',
    'client-methods': 'The total number of methods across all Feign clients.'
  };

  getDescription(key: string): string {
    return this.descriptions[key] || 'No description available.';
  }
}
