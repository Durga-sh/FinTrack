package com.personalfinancetracker.backend.controllers;

import com.personalfinancetracker.backend.dto.ExpenseRequest;
import com.personalfinancetracker.backend.dto.ExpenseResponse;
import com.personalfinancetracker.backend.entities.Customer;
import com.personalfinancetracker.backend.entities.Expense;
import com.personalfinancetracker.backend.repository.CustomerRepository;
import com.personalfinancetracker.backend.repository.ExpenseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseRepository expenseRepository;
    private final CustomerRepository customerRepository;

    @Autowired
    public ExpenseController(ExpenseRepository expenseRepository, CustomerRepository customerRepository) {
        this.expenseRepository = expenseRepository;
        this.customerRepository = customerRepository;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> addExpense(@RequestBody ExpenseRequest expenseRequest, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401)
                    .body(Collections.singletonMap("message", "User is not authenticated"));
        }

        String email = authentication.getName();

        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Expense expense = new Expense();
        expense.setAmount(expenseRequest.getAmount());
        expense.setCategory(expenseRequest.getCategory());
        expense.setDate(LocalDateTime.now());
        expense.setCustomer(customer);

        expenseRepository.save(expense);

        return ResponseEntity.ok(Collections.singletonMap("message", "Expense added successfully"));
    }

    @GetMapping
    public ResponseEntity<List<ExpenseResponse>> getExpenses(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }

        String email = authentication.getName();

        List<Expense> expenses = expenseRepository.findByCustomerEmail(email);

        // Map to ExpenseResponse DTOs
        List<ExpenseResponse> expenseResponses = expenses.stream()
                .map(expense -> new ExpenseResponse(
                        expense.getId(),
                        expense.getAmount(),
                        expense.getCategory(),
                        expense.getDate(),
                        expense.getCustomer().getEmail()
                ))
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(expenseResponses);
    }
}
