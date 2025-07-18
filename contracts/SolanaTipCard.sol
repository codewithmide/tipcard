// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ISPLTokenProgram} from "./precompiles/ISPLTokenProgram.sol";
import {ISolanaNative} from "./precompiles/ISolanaNative.sol";
import {ICallSolana} from "./precompiles/ICallSolana.sol";

contract SolanaTipCard {
    ISPLTokenProgram public constant SPLTOKEN_PROGRAM = ISPLTokenProgram(0xFf00000000000000000000000000000000000004);
    ISolanaNative public constant SOLANA_NATIVE = ISolanaNative(0xfF00000000000000000000000000000000000007);
    ICallSolana public constant CALL_SOLANA = ICallSolana(0xFF00000000000000000000000000000000000006);
    
    // Solana native SOL mint (System Program handles SOL transfers)
    bytes32 public constant SOL_MINT = bytes32(0);
    
    // Hex-encoding of Solana's Token program id
    bytes32 public constant TOKEN_PROGRAM_ID = 0x06ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a9;
    
    struct SolanaPaymentLink {
        address evmCreator;           // EVM address of creator
        bytes32 solanaCreator;        // Solana address of creator
        uint64 amount;                // Amount in SOL (lamports)
        bool isFlexible;              // Flexible amount allowed
        bool isActive;                // Link active status
        uint64 totalReceived;         // Total received in SOL (lamports)
        uint32 paymentCount;          // Number of payments received
        string description;           // Payment description
    }
    
    mapping(bytes32 => SolanaPaymentLink) public paymentLinks;
    mapping(address => bytes32[]) public userLinks;
    
    uint256 public linkCounter;
    
    event SolanaLinkCreated(
        bytes32 indexed linkId,
        address indexed evmCreator,
        bytes32 indexed solanaCreator,
        uint64 amount,
        bool isFlexible,
        string description
    );
    
    event SolanaPaymentReceived(
        bytes32 indexed linkId,
        bytes32 indexed payerSolana,
        bytes32 indexed recipientSolana,
        uint64 amount
    );
    
    event SolanaLinkDeactivated(bytes32 indexed linkId, address indexed creator);
    
    error LinkNotFound();
    error LinkInactive();
    error Unauthorized();
    error InvalidAmount();
    error TransferFailed();
    error InvalidTokenMint();
    error SolanaUserNotRegistered();
    error InsufficientBalance();
    
    function createSolanaPaymentLink(
        uint64 _suggestedAmount,
        bool _isFlexible,
        string memory _description
    ) external returns (bytes32) {
        // For flexible links, suggested amount can be 0
        if (!_isFlexible && _suggestedAmount == 0) {
            revert InvalidAmount();
        }
        
        // Get creator's Solana address from EVM address
        bytes32 creatorSolanaAddress = SOLANA_NATIVE.solanaAddress(msg.sender);
        if (creatorSolanaAddress == bytes32(0)) revert SolanaUserNotRegistered();
        
        // Generate unique link ID
        bytes32 linkId = keccak256(abi.encodePacked(
            msg.sender,
            creatorSolanaAddress,
            SOL_MINT, // Always SOL
            _suggestedAmount,
            _isFlexible,
            block.timestamp,
            linkCounter++
        ));
        
        // Create payment link where creator is the recipient
        paymentLinks[linkId] = SolanaPaymentLink({
            evmCreator: msg.sender,
            solanaCreator: creatorSolanaAddress, // Creator receives payments
            amount: _suggestedAmount,
            isFlexible: _isFlexible,
            isActive: true,
            totalReceived: 0,
            paymentCount: 0,
            description: _description
        });
        
        // Track user's links
        userLinks[msg.sender].push(linkId);
        
        emit SolanaLinkCreated(linkId, msg.sender, creatorSolanaAddress, _suggestedAmount, _isFlexible, _description);
        
        return linkId;
    }
    
    function paySolanaLink(
        bytes32 _linkId,
        uint64 _amount,
        bytes32 _payerSolanaAccount
    ) external {
        SolanaPaymentLink storage link = paymentLinks[_linkId];
        
        // Validate link exists and is active
        if (link.evmCreator == address(0)) revert LinkNotFound();
        if (!link.isActive) revert LinkInactive();
        
        // Determine payment amount
        uint64 paymentAmount;
        if (link.isFlexible) {
            if (_amount == 0) revert InvalidAmount();
            paymentAmount = _amount;
        } else {
            paymentAmount = link.amount;
        }
        
        // Note: SOL balance checking would be done by the System Program during transfer
        // If insufficient balance, the transfer will fail and revert
        
        // Execute SOL transfer via System Program
        _transferSOL(_payerSolanaAccount, link.solanaCreator, paymentAmount);
        
        // Update link statistics
        link.totalReceived += paymentAmount;
        link.paymentCount++;
        
        emit SolanaPaymentReceived(_linkId, _payerSolanaAccount, link.solanaCreator, paymentAmount);
    }
    
    /**
     * @dev Convenience function that automatically uses caller's Solana address for payment
     */
    function paySolanaLinkAuto(bytes32 _linkId, uint64 _amount) external {
        // Get caller's Solana address automatically
        bytes32 payerSolanaAddress = SOLANA_NATIVE.solanaAddress(msg.sender);
        if (payerSolanaAddress == bytes32(0)) revert SolanaUserNotRegistered();
        
        // Execute the same logic as paySolanaLink but with auto-resolved address
        SolanaPaymentLink storage link = paymentLinks[_linkId];
        
        // Validate link exists and is active
        if (link.evmCreator == address(0)) revert LinkNotFound();
        if (!link.isActive) revert LinkInactive();
        
        // Determine payment amount
        uint64 paymentAmount;
        if (link.isFlexible) {
            if (_amount == 0) revert InvalidAmount();
            paymentAmount = _amount;
        } else {
            paymentAmount = link.amount;
        }
        
        // Note: SOL balance checking would be done by the System Program during transfer
        // If insufficient balance, the transfer will fail and revert
        
        // Execute SOL transfer via System Program
        _transferSOL(payerSolanaAddress, link.solanaCreator, paymentAmount);
        
        // Update link statistics
        link.totalReceived += paymentAmount;
        link.paymentCount++;
        
        emit SolanaPaymentReceived(_linkId, payerSolanaAddress, link.solanaCreator, paymentAmount);
    }
    
    function _transferSOL(bytes32 _from, bytes32 _to, uint64 _amount) internal {
        // Use Neon's CALL_SOLANA to execute System Program transfer
        // System Program ID: 11111111111111111111111111111111 (all 1s in base58)
        // In hex: 0x0000000000000000000000000000000000000000000000000000000000000000
        bytes32 systemProgramId = 0x0000000000000000000000000000000000000000000000000000000000000000;
        
        // Create accounts for transfer instruction
        ICallSolana.AccountMeta[] memory accounts = new ICallSolana.AccountMeta[](2);
        accounts[0] = ICallSolana.AccountMeta({
            account: _from,
            is_signer: true,
            is_writable: true
        });
        accounts[1] = ICallSolana.AccountMeta({
            account: _to, 
            is_signer: false,
            is_writable: true
        });
        
        // Build transfer instruction data (instruction discriminator + lamports)
        bytes memory instructionData = abi.encodePacked(
            uint32(2),     // Transfer instruction discriminator for System Program
            _amount        // Amount in lamports
        );
        
        // Create the instruction
        ICallSolana.Instruction memory instruction = ICallSolana.Instruction({
            program_id: systemProgramId,
            accounts: accounts,
            instruction_data: instructionData
        });
        
        // Execute the SOL transfer via System Program
        try CALL_SOLANA.execute(0, instruction) {
            // Transfer successful
        } catch {
            revert TransferFailed();
        }
    }
    
    
    function deactivateSolanaLink(bytes32 _linkId) external {
        SolanaPaymentLink storage link = paymentLinks[_linkId];
        
        if (link.evmCreator != msg.sender) revert Unauthorized();
        
        link.isActive = false;
        
        emit SolanaLinkDeactivated(_linkId, msg.sender);
    }
    
    function getSolanaPaymentLink(bytes32 _linkId) external view returns (SolanaPaymentLink memory) {
        return paymentLinks[_linkId];
    }
    
    function getUserSolanaLinks(address _user) external view returns (bytes32[] memory) {
        return userLinks[_user];
    }
    
    function getSolanaLinkStats(bytes32 _linkId) external view returns (uint64 totalReceived, uint32 paymentCount) {
        SolanaPaymentLink storage link = paymentLinks[_linkId];
        return (link.totalReceived, link.paymentCount);
    }
    
    function getSolanaUserAddress(address _evmAddress) external view returns (bytes32) {
        return SOLANA_NATIVE.solanaAddress(_evmAddress);
    }
    
    function isSolanaUser(address _evmAddress) external view returns (bool) {
        return SOLANA_NATIVE.isSolanaUser(_evmAddress);
    }
    
    function getSOLBalance(bytes32 _account) external view returns (uint64) {
        // SOL balance querying would require a different precompile or method
        // For now, return 0 as placeholder - this would need proper implementation
        // using Solana account info queries
        return 0;
    }
}