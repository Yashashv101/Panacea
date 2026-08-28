package com.example.Panacea.common;

import org.springframework.boot.cache.autoconfigure.RedisCacheManagerBuilderCustomizer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;

/**
 * Kept out of {@code PanaceaApplication} deliberately: an {@code @EnableCaching} on the
 * {@code @SpringBootConfiguration} root class is processed even by test slices
 * (e.g. {@code @DataJpaTest}) that don't pull in {@code CacheAutoConfiguration}, so it
 * would require a CacheManager bean in every slice. A plain {@code @Configuration}
 * class is excluded by those slices' component-scan filters like any other
 * non-JPA bean, so caching only activates for the full application context.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    private static final Duration DEFAULT_TTL = Duration.ofMinutes(5);

    /**
     * Cached values (e.g. {@code AttendancePercentageResponse}) are records, which
     * aren't {@link java.io.Serializable} — the default JDK serializer would reject
     * them, so cache values are serialized as JSON instead. TTL is set explicitly
     * here (rather than via {@code spring.cache.redis.time-to-live}) since this
     * customizer replaces the whole cache-defaults configuration.
     */
    @Bean
    public RedisCacheManagerBuilderCustomizer redisCacheManagerBuilderCustomizer() {
        return builder -> builder.cacheDefaults(RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(DEFAULT_TTL)
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer())));
    }
}
