import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployFundTrack: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy with oracle address (use deployer address initially)
  await deploy("FundTrack", {
    from: deployer,
    args: [deployer], // Oracle address
    log: true,
    autoMine: true,
  });
};

export default deployFundTrack;
deployFundTrack.tags = ["FundTrack"];