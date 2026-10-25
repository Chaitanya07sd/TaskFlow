package com.taskflow;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.dto.LoginRequest;
import com.taskflow.dto.RegisterRequest;
import com.taskflow.dto.TimetableRequest;
import com.taskflow.entity.TimetableDay;
import com.taskflow.repository.TimetableRepository;
import com.taskflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalTime;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class TimetableIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TimetableRepository timetableRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        timetableRepository.deleteAll();
        userRepository.deleteAll();
    }

    private MockHttpSession registerAndLogin(String name, String email, String password) throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(name, email, password);
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        LoginRequest loginRequest = new LoginRequest(email, password);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        return (MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    @DisplayName("Should reject unauthenticated access to /api/timetable")
    void testUnauthenticatedAccess() throws Exception {
        mockMvc.perform(get("/api/timetable"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("Should create, retrieve, update and delete a timetable entry")
    void testTimetableLifecycle() throws Exception {
        MockHttpSession session = registerAndLogin("Student Alpha", "alpha.student@example.com", "Password123");

        // 1. Create a timetable entry
        TimetableRequest request = new TimetableRequest(
                "Mathematics Lecture",
                TimetableDay.MONDAY,
                LocalTime.of(9, 0),
                LocalTime.of(11, 0),
                "Room 204, Chapter 3, Professor Sharma"
        );

        MvcResult createResult = mockMvc.perform(post("/api/timetable")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.title", is("Mathematics Lecture")))
                .andExpect(jsonPath("$.data.day", is("MONDAY")))
                .andExpect(jsonPath("$.data.startTime", is("09:00")))
                .andExpect(jsonPath("$.data.endTime", is("11:00")))
                .andExpect(jsonPath("$.data.description", is("Room 204, Chapter 3, Professor Sharma")))
                .andReturn();

        Map<?, ?> responseMap = objectMapper.readValue(createResult.getResponse().getContentAsString(), Map.class);
        Map<?, ?> entryData = (Map<?, ?>) responseMap.get("data");
        Long entryId = Long.valueOf(entryData.get("id").toString());

        // 2. Fetch by day: MONDAY should have 1 entry
        mockMvc.perform(get("/api/timetable?day=MONDAY").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].title", is("Mathematics Lecture")));

        // 3. Fetch by another day: TUESDAY should be empty
        mockMvc.perform(get("/api/timetable?day=TUESDAY").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        // 4. Update entry
        TimetableRequest updateReq = new TimetableRequest(
                "Advanced Mathematics Lecture",
                TimetableDay.MONDAY,
                LocalTime.of(10, 0),
                LocalTime.of(12, 0),
                "Room 208, Chapter 4"
        );

        mockMvc.perform(put("/api/timetable/" + entryId)
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title", is("Advanced Mathematics Lecture")))
                .andExpect(jsonPath("$.data.startTime", is("10:00")))
                .andExpect(jsonPath("$.data.endTime", is("12:00")));

        // 5. Delete entry
        mockMvc.perform(delete("/api/timetable/" + entryId)
                        .session(session)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        // 6. Verify entry is deleted
        mockMvc.perform(get("/api/timetable/" + entryId).session(session))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should detect overlapping entries on the same day")
    void testOverlapDetection() throws Exception {
        MockHttpSession session = registerAndLogin("Overlap Tester", "overlap@example.com", "Password123");

        // Existing entry: 09:00 - 11:00 on Monday
        TimetableRequest req1 = new TimetableRequest(
                "Morning Class",
                TimetableDay.MONDAY,
                LocalTime.of(9, 0),
                LocalTime.of(11, 0),
                "Lecture hall A"
        );
        mockMvc.perform(post("/api/timetable").session(session).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated());

        // Check overlap with 10:00 - 12:00 (overlaps by 1 hour)
        mockMvc.perform(get("/api/timetable/check-overlap?day=MONDAY&startTime=10:00&endTime=12:00")
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].title", is("Morning Class")));

        // Check non-overlapping with 11:00 - 12:00 (exact adjacent boundary)
        mockMvc.perform(get("/api/timetable/check-overlap?day=MONDAY&startTime=11:00&endTime=12:00")
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    @DisplayName("Should reject entry when end time is before or equal to start time")
    void testTimeValidation() throws Exception {
        MockHttpSession session = registerAndLogin("Time Tester", "timetest@example.com", "Password123");

        // End time before start time
        TimetableRequest invalidReq = new TimetableRequest(
                "Invalid Entry",
                TimetableDay.WEDNESDAY,
                LocalTime.of(15, 0),
                LocalTime.of(14, 0),
                "Should fail"
        );

        mockMvc.perform(post("/api/timetable")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("End time must be later than start time.")));
    }

    @Test
    @DisplayName("Should allow optional description without forced predefined fields")
    void testOptionalDescription() throws Exception {
        MockHttpSession session = registerAndLogin("Desc Tester", "desctest@example.com", "Password123");

        // Entry with no description
        TimetableRequest noDescReq = new TimetableRequest(
                "Team Standup",
                TimetableDay.FRIDAY,
                LocalTime.of(10, 0),
                LocalTime.of(10, 30),
                null
        );

        mockMvc.perform(post("/api/timetable")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(noDescReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title", is("Team Standup")))
                .andExpect(jsonPath("$.data.description").doesNotExist());
    }

    @Test
    @DisplayName("Should strictly isolate timetable entries between different users (IDOR prevention)")
    void testTimetableUserIsolation() throws Exception {
        MockHttpSession user1Session = registerAndLogin("User One", "user1.tt@example.com", "Password123");
        MockHttpSession user2Session = registerAndLogin("User Two", "user2.tt@example.com", "Password123");

        // User 1 creates an entry
        TimetableRequest u1Req = new TimetableRequest(
                "User 1 Private Consultation",
                TimetableDay.THURSDAY,
                LocalTime.of(11, 0),
                LocalTime.of(12, 0),
                "Private meeting with supervisor"
        );

        MvcResult u1Result = mockMvc.perform(post("/api/timetable")
                        .session(user1Session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(u1Req)))
                .andExpect(status().isCreated())
                .andReturn();

        Map<?, ?> u1Data = (Map<?, ?>) ((Map<?, ?>) objectMapper.readValue(u1Result.getResponse().getContentAsString(), Map.class)).get("data");
        Long u1EntryId = Long.valueOf(u1Data.get("id").toString());

        // User 2 creates their own entry
        TimetableRequest u2Req = new TimetableRequest(
                "User 2 Gym Session",
                TimetableDay.THURSDAY,
                LocalTime.of(17, 0),
                LocalTime.of(18, 0),
                "Workout"
        );

        mockMvc.perform(post("/api/timetable")
                        .session(user2Session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(u2Req)))
                .andExpect(status().isCreated());

        // User 2 requests Thursday -> should only see their 1 entry
        mockMvc.perform(get("/api/timetable?day=THURSDAY").session(user2Session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].title", is("User 2 Gym Session")));

        // Insecure Direct Object Reference (IDOR) attacks:
        // 1. User 2 attempts to read User 1's entry
        mockMvc.perform(get("/api/timetable/" + u1EntryId).session(user2Session))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)));

        // 2. User 2 attempts to update User 1's entry
        TimetableRequest maliciousUpdate = new TimetableRequest(
                "Hacked Entry",
                TimetableDay.THURSDAY,
                LocalTime.of(11, 0),
                LocalTime.of(12, 0),
                "Hacked"
        );
        mockMvc.perform(put("/api/timetable/" + u1EntryId)
                        .session(user2Session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(maliciousUpdate)))
                .andExpect(status().isNotFound());

        // 3. User 2 attempts to delete User 1's entry
        mockMvc.perform(delete("/api/timetable/" + u1EntryId)
                        .session(user2Session)
                        .with(csrf()))
                .andExpect(status().isNotFound());

        // 4. Verify User 1's entry is completely unmodified
        mockMvc.perform(get("/api/timetable/" + u1EntryId).session(user1Session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title", is("User 1 Private Consultation")));
    }
}
