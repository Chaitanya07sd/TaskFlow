package com.taskflow.repository;

import com.taskflow.entity.TimetableDay;
import com.taskflow.entity.TimetableEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TimetableRepository extends JpaRepository<TimetableEntry, Long> {

    List<TimetableEntry> findByUserIdAndDayOrderByStartTimeAsc(Long userId, TimetableDay day);

    List<TimetableEntry> findByUserIdOrderByDayAscStartTimeAsc(Long userId);

    Optional<TimetableEntry> findByIdAndUserId(Long id, Long userId);
}
