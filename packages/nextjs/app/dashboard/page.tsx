"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";

/**
 * Dashboard Component
 * Shows user's created projects and funded projects with real-time milestone tracking
 */

interface Milestone {
  title: string;
  percentage: number;
  completed: boolean;
  completedAt: bigint;
}

interface Project {
  id: number;
  projectName: string;
  description: string;
  creator: string;
  targetAmount: bigint;
  fundsRaised: bigint;
  fundsReleased: bigint;
  active: boolean;
  createdAt: bigint;
  milestones: Milestone[];
}

const FUNDTRACK_ABI = deployedContracts[31337].FundTrack.abi;

import deployedContracts from "~~/contracts/deployedContracts";

const CONTRACT_ADDRESS = deployedContracts[31337].FundTrack.address;

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [createdProjects, setCreatedProjects] = useState<Project[]>([]);
  const [fundedProjects, setFundedProjects] = useState<Project[]>([]);
  const [selectedTab, setSelectedTab] = useState<"created" | "funded">("created");
  const [loading, setLoading] = useState(true);

  // Read project count
  const { data: projectCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FUNDTRACK_ABI,
    functionName: "projectCount",
  });

  // Fetch user's projects
  useEffect(() => {
    async function fetchUserProjects() {
      if (!projectCount || !address) return;
      
      setLoading(true);
      const count = Number(projectCount);
      const created: Project[] = [];
      const funded: Project[] = [];

      for (let i = 0; i < count; i++) {
        try {
          // Fetch project data (simplified - in practice use useReadContract hook)
          const projectData = await fetchProjectDetails(i);
          
          if (projectData) {
            // Check if user is creator
            if (projectData.creator.toLowerCase() === address.toLowerCase()) {
              created.push(projectData);
            }
            
            // Check if user has funded this project
            const contribution = await fetchContribution(i, address);
            if (contribution > 0n) {
              funded.push(projectData);
            }
          }
        } catch (error) {
          console.error(`Error fetching project ${i}:`, error);
        }
      }

      setCreatedProjects(created);
      setFundedProjects(funded);
      setLoading(false);
    }

    fetchUserProjects();
  }, [projectCount, address]);

  // Helper functions (simplified - would use hooks in practice)
  const fetchProjectDetails = async (projectId: number): Promise<Project | null> => {
    // In production, this would use useReadContract or fetch from API
    return null;
  };

  const fetchContribution = async (projectId: number, funder: string): Promise<bigint> => {
    // In production, this would use useReadContract
    return 0n;
  };

  // Calculate metrics
  const calculateMetrics = (projects: Project[]) => {
    const totalRaised = projects.reduce((sum, p) => sum + p.fundsRaised, 0n);
    const totalReleased = projects.reduce((sum, p) => sum + p.fundsReleased, 0n);
    const activeCount = projects.filter(p => p.active).length;
    
    return {
      totalRaised: formatEther(totalRaised),
      totalReleased: formatEther(totalReleased),
      activeCount,
      totalCount: projects.length
    };
  };

  const createdMetrics = calculateMetrics(createdProjects);
  const fundedMetrics = calculateMetrics(fundedProjects);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Connect Wallet</h2>
          <p className="text-gray-600">
            Please connect your wallet to view your dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">
            Manage your projects and track your investments
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-2xl shadow-lg">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setSelectedTab("created")}
                className={`px-8 py-4 font-semibold transition-colors ${
                  selectedTab === "created"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                My Projects ({createdProjects.length})
              </button>
              <button
                onClick={() => setSelectedTab("funded")}
                className={`px-8 py-4 font-semibold transition-colors ${
                  selectedTab === "funded"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Funded Projects ({fundedProjects.length})
              </button>
            </nav>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-8 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="text-sm text-gray-600 mb-2">Total Projects</div>
              <div className="text-3xl font-bold text-gray-900">
                {selectedTab === "created" ? createdMetrics.totalCount : fundedMetrics.totalCount}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="text-sm text-gray-600 mb-2">Active Projects</div>
              <div className="text-3xl font-bold text-green-600">
                {selectedTab === "created" ? createdMetrics.activeCount : fundedMetrics.activeCount}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="text-sm text-gray-600 mb-2">Total Raised</div>
              <div className="text-3xl font-bold text-blue-600">
                {selectedTab === "created" ? createdMetrics.totalRaised : fundedMetrics.totalRaised} ETH
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="text-sm text-gray-600 mb-2">Funds Released</div>
              <div className="text-3xl font-bold text-purple-600">
                {selectedTab === "created" ? createdMetrics.totalReleased : fundedMetrics.totalReleased} ETH
              </div>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white rounded-b-2xl shadow-lg p-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading projects...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {(selectedTab === "created" ? createdProjects : fundedProjects).length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-gray-600 text-lg">
                    {selectedTab === "created" 
                      ? "You haven't created any projects yet"
                      : "You haven't funded any projects yet"}
                  </p>
                </div>
              ) : (
                (selectedTab === "created" ? createdProjects : fundedProjects).map((project) => (
                  <ProjectCard key={project.id} project={project} isCreator={selectedTab === "created"} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Project Card Component
function ProjectCard({ project, isCreator }: { project: Project; isCreator: boolean }) {
  const progress = Number((project.fundsRaised * 100n) / project.targetAmount);
  const milestoneProgress = project.milestones.filter(m => m.completed).length;
  const totalMilestones = project.milestones.length;

  return (
    <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{project.projectName}</h3>
          <p className="text-gray-600 text-sm">{project.description}</p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
          project.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
        }`}>
          {project.active ? "Active" : "Completed"}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <div className="text-xs text-gray-600 mb-1">Funds Raised</div>
          <div className="text-lg font-bold text-blue-600">
            {formatEther(project.fundsRaised)} ETH
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Target</div>
          <div className="text-lg font-bold text-gray-900">
            {formatEther(project.targetAmount)} ETH
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Released</div>
          <div className="text-lg font-bold text-purple-600">
            {formatEther(project.fundsReleased)} ETH
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Milestones</div>
          <div className="text-lg font-bold text-green-600">
            {milestoneProgress}/{totalMilestones}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Funding Progress</span>
          <span className="font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Milestones */}
      <div>
        <div className="font-medium text-gray-900 mb-3">Milestones</div>
        <div className="space-y-3">
          {project.milestones.map((milestone, idx) => (
            <div key={idx} className="flex items-center">
              <div className={`w-8 h-8 rounded-full mr-3 flex items-center justify-center ${
                milestone.completed 
                  ? "bg-green-500 text-white" 
                  : "bg-gray-200 text-gray-500"
              }`}>
                {milestone.completed ? "✓" : idx + 1}
              </div>
              <div className="flex-1">
                <div className={`font-medium ${
                  milestone.completed ? "text-gray-900" : "text-gray-500"
                }`}>
                  {milestone.title}
                </div>
                <div className="text-xs text-gray-500">
                  {milestone.percentage}% of funds
                  {milestone.completed && (
                    <span className="ml-2 text-green-600">
                      ✓ Completed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}