package com.ecommerce.user.service;

import com.ecommerce.user.dto.UserDTO;
import com.ecommerce.user.entity.User;
import com.ecommerce.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    
    private final UserRepository userRepository;
    
    @Transactional
    public UserDTO createUser(UserDTO userDTO) {
        log.info("Creating new user with email: {}", userDTO.getEmail());
        
        if (userRepository.existsByEmail(userDTO.getEmail())) {
            throw new RuntimeException("User with email " + userDTO.getEmail() + " already exists");
        }
        
        User user = new User();
        user.setEmail(userDTO.getEmail());
        user.setFirstName(userDTO.getFirstName());
        user.setLastName(userDTO.getLastName());
        user.setPassword(userDTO.getPassword()); // In production, hash this!
        user.setPhone(userDTO.getPhone());
        user.setIsActive(true);
        
        User savedUser = userRepository.save(user);
        log.info("User created successfully with ID: {}", savedUser.getId());
        
        return convertToDTO(savedUser);
    }
    
    public Optional<UserDTO> getUserById(Long id) {
        log.info("Fetching user with ID: {}", id);
        return userRepository.findById(id).map(this::convertToDTO);
    }
    
    public Optional<UserDTO> getUserByEmail(String email) {
        log.info("Fetching user with email: {}", email);
        return userRepository.findByEmail(email).map(this::convertToDTO);
    }
    
    public List<UserDTO> getAllUsers(int page, int size) {
        log.info("Fetching users - page: {}, size: {}", page, size);
        Page<User> userPage = userRepository.findAll(PageRequest.of(page, size));
        return userPage.getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public Optional<UserDTO> updateUser(Long id, UserDTO userDTO) {
        log.info("Updating user with ID: {}", id);
        
        return userRepository.findById(id).map(user -> {
            user.setFirstName(userDTO.getFirstName());
            user.setLastName(userDTO.getLastName());
            user.setPhone(userDTO.getPhone());
            
            if (userDTO.getPassword() != null && !userDTO.getPassword().isEmpty()) {
                user.setPassword(userDTO.getPassword()); // In production, hash this!
            }
            
            User updatedUser = userRepository.save(user);
            log.info("User updated successfully: {}", updatedUser.getId());
            return convertToDTO(updatedUser);
        });
    }
    
    @Transactional
    public boolean deleteUser(Long id) {
        log.info("Deleting user with ID: {}", id);
        
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            log.info("User deleted successfully: {}", id);
            return true;
        }
        
        log.warn("User not found for deletion: {}", id);
        return false;
    }
    
    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setPhone(user.getPhone());
        dto.setIsActive(user.getIsActive());
        // Don't include password in DTO!
        return dto;
    }
}