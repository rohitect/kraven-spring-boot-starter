package io.github.rohitect.kraven.example.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.cloud.openfeign.support.SpringMvcContract;
import feign.Contract;
import feign.codec.Encoder;
import feign.codec.Decoder;
import org.springframework.cloud.openfeign.support.SpringEncoder;
import org.springframework.cloud.openfeign.support.SpringDecoder;
import org.springframework.beans.factory.ObjectFactory;
import org.springframework.boot.autoconfigure.http.HttpMessageConverters;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;

/**
 * Configuration for Feign clients.
 */
@Configuration
public class FeignClientConfig {

    /**
     * Creates a Feign contract bean.
     *
     * @return SpringMvcContract
     */
    @Bean
    public Contract feignContract() {
        return new SpringMvcContract();
    }

    /**
     * Creates a message converters bean for Feign clients.
     *
     * @return ObjectFactory<HttpMessageConverters>
     */
    @Bean(name = "feignMessageConverters")
    public ObjectFactory<HttpMessageConverters> feignMessageConverters() {
        return () -> new HttpMessageConverters(new MappingJackson2HttpMessageConverter());
    }

    /**
     * Creates a Feign encoder bean.
     *
     * @return SpringEncoder
     */
    @Bean
    public Encoder feignEncoder() {
        return new SpringEncoder(feignMessageConverters());
    }

    /**
     * Creates a Feign decoder bean.
     *
     * @return SpringDecoder
     */
    @Bean
    public Decoder feignDecoder() {
        return new SpringDecoder(feignMessageConverters());
    }
}
