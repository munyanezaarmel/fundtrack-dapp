"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

/**
 * CreateProject Component
 * Allows wallet-connected users to create new funding projects with milestones
 */
export default function CreateProject() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  // Form state
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [milestones, setMilestones] = useState([{ title: "", percentage: "" }]);

  // Contract interaction hooks
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle milestone addition
  const addMilestone = () => {
    setMilestones([...milestones, { title: "", percentage: "" }]);
  };

  // Handle milestone removal
  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  // Handle milestone change
  const updateMilestone = (index: number, field: "title" | "percentage", value: string) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  // Calculate total percentage
  const totalPercentage = milestones.reduce((sum, m) => sum + (parseInt(m.percentage) || 0), 0);

  // Validate form
  const isFormValid = () => {
    if (!projectName || !description || !targetAmount) return false;
    if (milestones.length === 0) return false;
    if (totalPercentage !== 100) return false;

    for (const milestone of milestones) {
      if (!milestone.title || !milestone.percentage) return false;
      if (parseInt(milestone.percentage) <= 0) return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!isFormValid()) {
      alert("Please fill all fields and ensure percentages sum to 100");
      return;
    }

    try {
      const milestoneTitles = milestones.map(m => m.title);
      const milestonePercentages = milestones.map(m => parseInt(m.percentage));

      // Call smart contract createProject function
      writeContract({
        address: process.env.NEXT_PUBLIC_FUNDTRACK_CONTRACT_ADDRESS as `0x${string}`,
        abi: [
          {
            name: "createProject",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "_projectName", type: "string" },
              { name: "_description", type: "string" },
              { name: "_targetAmount", type: "uint256" },
              { name: "_milestoneTitles", type: "string[]" },
              { name: "_milestonePercentages", type: "uint8[]" },
            ],
            outputs: [{ name: "", type: "uint256" }],
          },
        ],
        functionName: "createProject",
        args: [projectName, description, parseEther(targetAmount), milestoneTitles, milestonePercentages],
      });
    } catch (err) {
      console.error("Error creating project:", err);
    }
  };

  // Handle success
  if (isSuccess) {
    setTimeout(() => {
      router.push("/projects");
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Create New Project</h1>
            <p className="text-gray-600">Launch your project with milestone-based funding</p>
          </div>

          {/* Wallet Connection Check */}
          {!isConnected ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-yellow-800 font-medium">Please connect your wallet to create a project</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Solar Farm Development"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your project, goals, and impact..."
                  required
                />
              </div>

              {/* Target Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Amount (ETH) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={targetAmount}
                  onChange={e => setTargetAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 10"
                  required
                />
              </div>

              {/* Milestones Section */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Milestones</h3>
                  <span
                    className={`text-sm font-medium ${totalPercentage === 100 ? "text-green-600" : "text-red-600"}`}
                  >
                    Total: {totalPercentage}%
                  </span>
                </div>

                {milestones.map((milestone, index) => (
                  <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-700">Milestone {index + 1}</span>
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={milestone.title}
                          onChange={e => updateMilestone(index, "title", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Milestone title"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={milestone.percentage}
                          onChange={e => updateMilestone(index, "percentage", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="%"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addMilestone}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  + Add Milestone
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={!isFormValid() || isPending || isConfirming}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {isPending
                    ? "Waiting for wallet..."
                    : isConfirming
                      ? "Creating project..."
                      : isSuccess
                        ? "✓ Project Created!"
                        : "Create Project"}
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">Error: {error.message}</p>
                </div>
              )}

              {/* Success Message */}
              {isSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">Project created successfully! Redirecting...</p>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
