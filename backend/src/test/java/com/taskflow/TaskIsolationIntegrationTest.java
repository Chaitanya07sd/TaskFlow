package com.taskflow;

import tools.jackson.databind.ObjectMapper;
import com.taskflow.dto.LoginRequest;
import com.taskflow.dto.RegisterRequest;
import com.taskflow.dto.TaskRequest;
import com.taskflow.entity.TaskStatus;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class TaskIsolationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
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
    @DisplayName("Should reject unauthenticated access to /api/tasks")
    void testUnauthenticatedTaskAccess() throws Exception {
        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("Should perform complete Task CRUD lifecycle and update statistics")
    void testTaskLifecycleAndStats() throws Exception {
        MockHttpSession session = registerAndLogin("User Alpha", "alpha@example.com", "Password123");

        // 1. Create a task
        TaskRequest createReq = new TaskRequest("Configure Jenkins Pipeline", "Set up multi-stage CI/CD", TaskStatus.PENDING);
        MvcResult createResult = mockMvc.perform(post("/api/tasks")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.title", is("Configure Jenkins Pipeline")))
                .andExpect(jsonPath("$.data.status", is("PENDING")))
                .andReturn();

        Map<?, ?> responseMap = objectMapper.readValue(createResult.getResponse().getContentAsString(), Map.class);
        Map<?, ?> taskData = (Map<?, ?>) responseMap.get("data");
        Long taskId = Long.valueOf(taskData.get("id").toString());

        // 2. Fetch single task
        mockMvc.perform(get("/api/tasks/" + taskId).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title", is("Configure Jenkins Pipeline")));

        // 3. Edit task
        TaskRequest updateReq = new TaskRequest("Configure Jenkins Pipeline Updated", "Added webhook config", TaskStatus.PENDING);
        mockMvc.perform(put("/api/tasks/" + taskId)
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title", is("Configure Jenkins Pipeline Updated")));

        // 4. Update status to COMPLETED
        mockMvc.perform(patch("/api/tasks/" + taskId + "/status")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "COMPLETED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("COMPLETED")));

        // 5. Verify Stats
        mockMvc.perform(get("/api/tasks/stats").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalTasks", is(1)))
                .andExpect(jsonPath("$.data.pendingTasks", is(0)))
                .andExpect(jsonPath("$.data.completedTasks", is(1)))
                .andExpect(jsonPath("$.data.completionRate", is(100.0)));

        // 6. Delete task
        mockMvc.perform(delete("/api/tasks/" + taskId)
                        .session(session)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        // 7. Verify task no longer exists
        mockMvc.perform(get("/api/tasks/" + taskId).session(session))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should strictly isolate tasks between two users (no IDOR vulnerability)")
    void testUserIsolationAndIdorPrevention() throws Exception {
        MockHttpSession user1Session = registerAndLogin("User One", "user1@example.com", "Password123");
        MockHttpSession user2Session = registerAndLogin("User Two", "user2@example.com", "Password123");

        // User 1 creates a private task
        TaskRequest task1Req = new TaskRequest("User 1 Secret Roadmap", "Confidential details", TaskStatus.PENDING);
        MvcResult user1Result = mockMvc.perform(post("/api/tasks")
                        .session(user1Session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(task1Req)))
                .andExpect(status().isCreated())
                .andReturn();

        Map<?, ?> task1Data = (Map<?, ?>) ((Map<?, ?>) objectMapper.readValue(user1Result.getResponse().getContentAsString(), Map.class)).get("data");
        Long user1TaskId = Long.valueOf(task1Data.get("id").toString());

        // User 2 creates their own task
        TaskRequest task2Req = new TaskRequest("User 2 Public Task", "Ordinary details", TaskStatus.PENDING);
        mockMvc.perform(post("/api/tasks")
                        .session(user2Session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(task2Req)))
                .andExpect(status().isCreated());

        // Verify User 2's task list only has 1 task (their own)
        mockMvc.perform(get("/api/tasks").session(user2Session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].title", is("User 2 Public Task")));

        // Insecure Direct Object Reference (IDOR) attacks:
        // 1. User 2 attempts to read User 1's task by ID -> must fail with 404 (or 403) and NOT leak content!
        mockMvc.perform(get("/api/tasks/" + user1TaskId).session(user2Session))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)));

        // 2. User 2 attempts to modify User 1's task -> must fail with 404
        TaskRequest maliciousUpdate = new TaskRequest("Hacked Title", "Hacked Description", TaskStatus.COMPLETED);
        mockMvc.perform(put("/api/tasks/" + user1TaskId)
                        .session(user2Session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(maliciousUpdate)))
                .andExpect(status().isNotFound());

        // 3. User 2 attempts to delete User 1's task -> must fail with 404
        mockMvc.perform(delete("/api/tasks/" + user1TaskId)
                        .session(user2Session)
                        .with(csrf()))
                .andExpect(status().isNotFound());

        // 4. Verify User 1's task is completely untouched
        mockMvc.perform(get("/api/tasks/" + user1TaskId).session(user1Session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title", is("User 1 Secret Roadmap")))
                .andExpect(jsonPath("$.data.status", is("PENDING")));
    }

    @Test
    @DisplayName("Should search and filter tasks by status and keywords")
    void testSearchAndFilter() throws Exception {
        MockHttpSession session = registerAndLogin("Search User", "searcher@example.com", "Password123");

        TaskRequest task1 = new TaskRequest("Deploy to Docker", "Write docker-compose file", TaskStatus.PENDING);
        TaskRequest task2 = new TaskRequest("Configure Jenkins", "Write pipeline stages", TaskStatus.COMPLETED);
        TaskRequest task3 = new TaskRequest("Docker Hub upload", "Push image to registry", TaskStatus.PENDING);

        mockMvc.perform(post("/api/tasks").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(task1))).andExpect(status().isCreated());
        mockMvc.perform(post("/api/tasks").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(task2))).andExpect(status().isCreated());
        mockMvc.perform(post("/api/tasks").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(task3))).andExpect(status().isCreated());

        // Filter: PENDING
        mockMvc.perform(get("/api/tasks?status=PENDING").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));

        // Filter: COMPLETED
        mockMvc.perform(get("/api/tasks?status=COMPLETED").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].title", is("Configure Jenkins")));

        // Search: "Docker"
        mockMvc.perform(get("/api/tasks?search=Docker").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));
    }

    @Test
    @DisplayName("Should create task without deadline, and task with optional deadline and weekly recurrence")
    void testOptionalDeadlineAndRecurringTasks() throws Exception {
        MockHttpSession session = registerAndLogin("Planner User", "planner@example.com", "Password123");

        // 1. Task without deadline
        TaskRequest noDeadlineReq = new TaskRequest(
                "Read documentation",
                "Optional learning task",
                TaskStatus.PENDING,
                null,
                false,
                null
        );

        mockMvc.perform(post("/api/tasks")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(noDeadlineReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title", is("Read documentation")))
                .andExpect(jsonPath("$.data.dueDate").doesNotExist())
                .andExpect(jsonPath("$.data.recurringWeekly", is(false)));

        // 2. Task with deadline and weekly recurrence
        TaskRequest recurringReq = new TaskRequest(
                "Submit Weekly Report",
                "Summarize weekly sprint deliverables",
                TaskStatus.PENDING,
                java.time.LocalDate.of(2026, 11, 20),
                true,
                com.taskflow.entity.TimetableDay.FRIDAY
        );

        mockMvc.perform(post("/api/tasks")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(recurringReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title", is("Submit Weekly Report")))
                .andExpect(jsonPath("$.data.dueDate", is("2026-11-20")))
                .andExpect(jsonPath("$.data.recurringWeekly", is(true)))
                .andExpect(jsonPath("$.data.recurrenceDay", is("FRIDAY")));
    }
}
