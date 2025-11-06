// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FundTrack
 * @dev Transparent funding platform for development projects with milestone-based fund release
 * @notice This contract manages project creation, funding, and oracle-verified milestone completion
 */
contract FundTrack {
    
    // ============ State Variables ============
    
    address public oracle; // Oracle address for milestone verification
    uint256 public projectCount;
    
    // ============ Structs ============
    
    struct Milestone {
        string title;
        uint8 percentage; // Percentage of total funds to release (e.g., 25 for 25%)
        bool completed;
        uint256 completedAt;
    }
    
    struct Project {
        uint256 id;
        string projectName;
        string description;
        address creator;
        uint256 targetAmount;
        uint256 fundsRaised;
        uint256 fundsReleased;
        bool active;
        uint256 createdAt;
        Milestone[] milestones;
    }
    
    // ============ Mappings ============
    
    mapping(uint256 => Project) public projects;
    mapping(uint256 => mapping(address => uint256)) public contributions; // projectId => funder => amount
    
    // ============ Events ============
    
    event ProjectCreated(
        uint256 indexed projectId,
        address indexed creator,
        string projectName,
        uint256 targetAmount,
        uint256 timestamp
    );
    
    event Funded(
        uint256 indexed projectId,
        address indexed funder,
        uint256 amount,
        uint256 totalFundsRaised
    );
    
    event MilestoneVerified(
        uint256 indexed projectId,
        uint256 milestoneIndex,
        string milestoneTitle,
        uint256 timestamp
    );
    
    event FundsReleased(
        uint256 indexed projectId,
        address indexed creator,
        uint256 amount,
        uint256 milestoneIndex
    );
    
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    
    event ProjectDeactivated(uint256 indexed projectId);
    
    // ============ Modifiers ============
    
    modifier onlyCreator(uint256 _projectId) {
        require(
            projects[_projectId].creator == msg.sender,
            "Only project creator can call this"
        );
        _;
    }
    
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can call this");
        _;
    }
    
    modifier projectExists(uint256 _projectId) {
        require(_projectId < projectCount, "Project does not exist");
        _;
    }
    
    modifier projectActive(uint256 _projectId) {
        require(projects[_projectId].active, "Project is not active");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _oracle) {
        require(_oracle != address(0), "Invalid oracle address");
        oracle = _oracle;
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Create a new project with milestones
     * @param _projectName Name of the project
     * @param _description Project description
     * @param _targetAmount Target funding amount in wei
     * @param _milestoneTitles Array of milestone titles
     * @param _milestonePercentages Array of percentages for each milestone (must sum to 100)
     */
    function createProject(
        string memory _projectName,
        string memory _description,
        uint256 _targetAmount,
        string[] memory _milestoneTitles,
        uint8[] memory _milestonePercentages
    ) external returns (uint256) {
        require(bytes(_projectName).length > 0, "Project name required");
        require(_targetAmount > 0, "Target amount must be greater than 0");
        require(
            _milestoneTitles.length == _milestonePercentages.length,
            "Milestones length mismatch"
        );
        require(_milestoneTitles.length > 0, "At least one milestone required");
        
        // Validate percentages sum to 100
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _milestonePercentages.length; i++) {
            totalPercentage += _milestonePercentages[i];
        }
        require(totalPercentage == 100, "Milestone percentages must sum to 100");
        
        uint256 projectId = projectCount;
        Project storage newProject = projects[projectId];
        
        newProject.id = projectId;
        newProject.projectName = _projectName;
        newProject.description = _description;
        newProject.creator = msg.sender;
        newProject.targetAmount = _targetAmount;
        newProject.fundsRaised = 0;
        newProject.fundsReleased = 0;
        newProject.active = true;
        newProject.createdAt = block.timestamp;
        
        // Add milestones
        for (uint256 i = 0; i < _milestoneTitles.length; i++) {
            newProject.milestones.push(
                Milestone({
                    title: _milestoneTitles[i],
                    percentage: _milestonePercentages[i],
                    completed: false,
                    completedAt: 0
                })
            );
        }
        
        projectCount++;
        
        emit ProjectCreated(
            projectId,
            msg.sender,
            _projectName,
            _targetAmount,
            block.timestamp
        );
        
        return projectId;
    }
    
    /**
     * @dev Fund a project - funds go into escrow
     * @param _projectId ID of the project to fund
     */
    function fundProject(uint256 _projectId)
        external
        payable
        projectExists(_projectId)
        projectActive(_projectId)
    {
        require(msg.value > 0, "Must send funds");
        
        Project storage project = projects[_projectId];
        
        project.fundsRaised += msg.value;
        contributions[_projectId][msg.sender] += msg.value;
        
        emit Funded(
            _projectId,
            msg.sender,
            msg.value,
            project.fundsRaised
        );
    }
    
    /**
     * @dev Oracle verifies milestone completion and releases funds
     * @param _projectId ID of the project
     * @param _milestoneIndex Index of the milestone to verify
     */
    function verifyMilestone(uint256 _projectId, uint256 _milestoneIndex)
        external
        onlyOracle
        projectExists(_projectId)
        projectActive(_projectId)
    {
        Project storage project = projects[_projectId];
        
        require(
            _milestoneIndex < project.milestones.length,
            "Invalid milestone index"
        );
        require(
            !project.milestones[_milestoneIndex].completed,
            "Milestone already completed"
        );
        
        // Mark milestone as completed
        project.milestones[_milestoneIndex].completed = true;
        project.milestones[_milestoneIndex].completedAt = block.timestamp;
        
        emit MilestoneVerified(
            _projectId,
            _milestoneIndex,
            project.milestones[_milestoneIndex].title,
            block.timestamp
        );
        
        // Calculate and release funds
        uint256 amountToRelease = (project.fundsRaised *
            project.milestones[_milestoneIndex].percentage) / 100;
        
        require(amountToRelease > 0, "No funds to release");
        require(
            address(this).balance >= amountToRelease,
            "Insufficient contract balance"
        );
        
        project.fundsReleased += amountToRelease;
        
        // Transfer funds to project creator
        (bool success, ) = payable(project.creator).call{value: amountToRelease}("");
        require(success, "Transfer failed");
        
        emit FundsReleased(
            _projectId,
            project.creator,
            amountToRelease,
            _milestoneIndex
        );
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get project details
     * @param _projectId ID of the project
     */
    function getProject(uint256 _projectId)
        external
        view
        projectExists(_projectId)
        returns (
            uint256 id,
            string memory projectName,
            string memory description,
            address creator,
            uint256 targetAmount,
            uint256 fundsRaised,
            uint256 fundsReleased,
            bool active,
            uint256 createdAt
        )
    {
        Project storage project = projects[_projectId];
        return (
            project.id,
            project.projectName,
            project.description,
            project.creator,
            project.targetAmount,
            project.fundsRaised,
            project.fundsReleased,
            project.active,
            project.createdAt
        );
    }
    
    /**
     * @dev Get milestones for a project
     * @param _projectId ID of the project
     */
    function getMilestones(uint256 _projectId)
        external
        view
        projectExists(_projectId)
        returns (Milestone[] memory)
    {
        return projects[_projectId].milestones;
    }
    
    /**
     * @dev Get contribution amount for a specific funder
     * @param _projectId ID of the project
     * @param _funder Address of the funder
     */
    function getContribution(uint256 _projectId, address _funder)
        external
        view
        returns (uint256)
    {
        return contributions[_projectId][_funder];
    }
    
    /**
     * @dev Get all projects (returns array of project IDs)
     */
    function getAllProjectIds() external view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](projectCount);
        for (uint256 i = 0; i < projectCount; i++) {
            ids[i] = i;
        }
        return ids;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Update oracle address
     * @param _newOracle New oracle address
     */
    function updateOracle(address _newOracle) external onlyOracle {
        require(_newOracle != address(0), "Invalid oracle address");
        address oldOracle = oracle;
        oracle = _newOracle;
        emit OracleUpdated(oldOracle, _newOracle);
    }
    
    /**
     * @dev Deactivate a project (only creator can deactivate)
     * @param _projectId ID of the project
     */
    function deactivateProject(uint256 _projectId)
        external
        onlyCreator(_projectId)
        projectExists(_projectId)
    {
        projects[_projectId].active = false;
        emit ProjectDeactivated(_projectId);
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}