import static org.junit.jupiter.api.Assertions.assertEquals;

import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

public class SatelliteDataExporterTest {

    @TempDir
    Path tempDir;
    private String originalUserDir;

    @BeforeEach
    void setUp() {
        originalUserDir = System.getProperty("user.dir");
        System.setProperty("user.dir", tempDir.toString());
    }

    @AfterEach
    void tearDown() {
        System.setProperty("user.dir", originalUserDir);
    }

    private String invoke(String norad) throws Exception {
        Method m = Class.forName("com.openbexi.satellites.SatelliteDataExporter")
                .getDeclaredMethod("getLaunchDateByNorad", String.class);
        m.setAccessible(true);
        return (String) m.invoke(null, norad);
    }

    @Test
    void returnsLaunchDateWhenIdFound() throws Exception {
        Path file = tempDir.resolve(Paths.get("json", "tle", "satellite_launch_dates.json"));
        Files.createDirectories(file.getParent());
        Files.writeString(file,
                "[{\"name\":\"TEST\",\"norad_id\":\"12345\",\"launch_date\":\"2024-01-01\"}]");

        String result = invoke("12345");
        assertEquals("2024-01-01", result);
    }

    @Test
    void returnsNoDataWhenFileAbsentOrIdMissing() throws Exception {
        // file does not exist
        String result = invoke("99999");
        assertEquals("no data", result);

        // file exists but id not present
        Path file = tempDir.resolve(Paths.get("json", "tle", "satellite_launch_dates.json"));
        Files.createDirectories(file.getParent());
        Files.writeString(file,
                "[{\"name\":\"TEST\",\"norad_id\":\"12345\",\"launch_date\":\"2024-01-01\"}]");

        result = invoke("99999");
        assertEquals("no data", result);
    }
}
