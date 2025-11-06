"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { useRouter } from "next/navigation";

/**
 * BrowseProjects Component
 * Display all projects with funding capabilities and milestone tracking
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

export default function BrowseProjects() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [fundAmount, setFundAmount] = useState("");

  // Read project count
  const { data: projectCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FUNDTRACK_ABI,
    functionName: "projectCount",
  });

  // Fund project hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Fetch all projects
  useEffect(() => {
    async function fetchProjects() {
      if (!projectCount) return;
      
      const count = Number(projectCount);
      const projectPromises = [];

      for (let i = 0; i < count; i++) {
        projectPromises.push(fetchProjectData(i));
      }

      const fetchedProjects = await Promise.all(projectPromises);
      setProjects(fetchedProjects.filter(p => p !== null) as Project[]);
    }

    fetchProjects();
  }, [projectCount]);

  // Fetch individual project data
  const fetchProjectData = async (projectId: number): Promise<Project | null> => {
    try {
      // This would use useReadContract in practice, simplified here for demonstration
      // In real implementation, you'd use multiple useReadContract hooks or a custom hook
      const response = await fetch(`/api/project/${projectId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching project ${projectId}:`, error);
      return null;
    }
  };

  // Handle funding
  const handleFund = (projectId: number) => {
    if (!isConnected) {
      alert("Please connect your wallet");
      return;
    }

    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDTRACK_ABI,
        functionName: "fundProject",
        args: [BigInt(projectId)],
        value: parseEther(fundAmount),
      });
    } catch (error) {
      console.error("Error funding project:", error);
    }
  };

  // Calculate funding progress
  const calculateProgress = (fundsRaised: bigint, targetAmount: bigint) => {
    if (targetAmount === 0n) return 0;
    return Number((fundsRaised * 100n) / targetAmount);
  };

  // Calculate milestone completion
  const calculateMilestoneCompletion = (milestones: Milestone[]) => {
    if (!milestones.length) return 0;
    const completed = milestones.filter(m => m.completed).length;
    return Math.round((completed / milestones.length) * 100);
  };

  // Reset after successful funding
  useEffect(() => {
    if (isSuccess) {
      setFundAmount("");
      setSelectedProject(null);
      // Refetch projects
      window.location.reload();
    }
  }, [isSuccess]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Browse Projects
          </h1>
          <p className="text-xl text-gray-600">
            Support innovative projects with transparent milestone-based funding
          </p>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg">No projects yet. Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => {
              const progress = calculateProgress(project.fundsRaised, project.targetAmount);
              const milestoneProgress = calculateMilestoneCompletion(project.milestones);
              
              return (
                <div
                  key={project.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow"
                >
                  {/* Project Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                    <h3 className="text-2xl font-bold mb-2">{project.projectName}</h3>
                    <p className="text-sm opacity-90">
                      by {project.creator.slice(0, 6)}...{project.creator.slice(-4)}
                    </p>
                  </div>

                  {/* Project Body */}
                  <div className="p-6">
                    <p className="text-gray-700 mb-4 line-clamp-3">{project.description}</p>

                    {/* Funding Progress */}
                    <div className="mb-4">
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
                      <div className="flex justify-between text-sm mt-2 text-gray-600">
                        <span>{formatEther(project.fundsRaised)} ETH raised</span>
                        <span>{formatEther(project.targetAmount)} ETH goal</span>
                      </div>
                    </div>

                    {/* Milestones */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">Milestones</span>
                        <span className="font-bold text-green-600">{milestoneProgress}%</span>
                      </div>
                      <div className="space-y-2">
                        {project.milestones.map((milestone, idx) => (
                          <div key={idx} className="flex items-center text-sm">
                            <div className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${
                              milestone.completed ? "bg-green-500" : "bg-gray-300"
                            }`}>
                              {milestone.completed && (
                                <span className="text-white text-xs">✓</span>
                              )}
                            </div>
                            <span className={milestone.completed ? "text-gray-900" : "text-gray-500"}>
                              {milestone.title} ({milestone.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mb-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        project.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {project.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Fund Section */}
                    {project.active && (
                      <div className="border-t pt-4">
                        {selectedProject === project.id ? (
                          <div className="space-y-3">
                            <input
                              type="number"
                              step="0.01"
                              value={fundAmount}
                              onChange={(e) => setFundAmount(e.target.value)}
                              placeholder="Amount in ETH"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleFund(project.id)}
                                disabled={isPending || isConfirming}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                              >
                                {isPending ? "Confirm..." : isConfirming ? "Funding..." : "Confirm"}
                              </button>
                              <button
                                onClick={() => setSelectedProject(null)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedProject(project.id)}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
                          >
                            Fund This Project
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}