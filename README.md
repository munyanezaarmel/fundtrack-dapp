# 🌍 FundTrack

**FundTrack** FundTrack is a blockchain-based platform designed to bring transparency, accountability, and trust to development funding.
It helps ensure that money meant for projects like hospitals, schools, or renewable energy is used exactly as intended, reducing fund misuse and restoring investor confidence.

---

## 🚨 Problem Statement

In many developing countries, public and donor-funded projects often suffer from **corruption, inefficiency, and lack of transparency**.  
For example, in **South Sudan**, communities face difficulties attracting investors because of a **history of fund misuse** and **limited accountability** in how development funds are distributed and monitored.

Government officials or agencies typically manage these funds manually, leading to:

- Delayed or incomplete project execution  
- Fake project reporting with no physical progress  
- Donors losing trust due to poor visibility on how funds are spent  
- Citizens being unaware of ongoing or completed public projects  

These issues reduce investor confidence and make it harder for genuine local projects to get funded.  
There is an urgent need for a **trustless system** that ensures **funds are used for their intended purpose** — without relying on human intermediaries.

---

## 💡 Solution

**FundTrack** leverages **Ethereum smart contracts** to automatically manage funds based on verified progress.

1. **Project Creation:** Verified users (e.g., NGOs, government wallets) post projects needing funding.  
2. **Funding:** Donors contribute transparently using cryptocurrency.  
3. **Verification:** Before each milestone payment is released, the system requires **proof of completion** — verified via **satellite data, AI image analysis**, or **community oracles**.  
4. **Fund Release:** Once verified, the smart contract releases funds automatically, ensuring that **money follows progress**.

This creates a **decentralized, tamper-proof funding process** that builds **trust** among donors, government bodies, and citizens.

---

## ⚙️ Tech Stack

- **Scaffold-ETH 2** (Next.js, Hardhat, Wagmi, Viem)  
- **Solidity** for smart contracts  
- **Ethers.js** for blockchain interactions  
- **Tailwind CSS** for frontend design  
- **Node.js Oracle** (optional) for verification via APIs  
- **IPFS / Pinata** for decentralized project data (optional)

---

## 🧩 How It Works

1. **Create Project:** A verified wallet posts project details and milestones.  
2. **Fund Project:** Users or donors fund the project directly on-chain.  
3. **Verify Milestones:** Oracle checks satellite or image data for completion progress.  
4. **Automatic Release:** Smart contract releases the next milestone payment when verified.  
5. **Dashboard:** Publicly displays all transactions for full transparency.

---
## Future Additions

- 🛰️ Satellite Oracles: Automated milestone verification using Earth observation data.

- 🤖 AI Image Analysis: Analyze satellite images to detect progress (e.g., building size or color).

- 📱 IoT Integration (future): Smart sensors to track energy usage, water flow, or emissions.

- 🧾 Impact Reports: Automatically generated reports for donors and stakeholders.

## 👥 Who Benefits

- Investors & Donors: Gain confidence that their money is used properly.

- Governments: Can attract more funding by being transparent.

- Communities: Receive better-managed, faster, and verifiable development projects.

## Example Scenario

Project: Build a water well in Juba, South Sudan

- The Ministry of Water connects its wallet and creates the project.

- Donors fund the project with $10,000 worth of crypto.

- Milestone 1: Digging completed — verified via a satellite or local report.

- Smart contract releases 30% of the funds.

- Milestone 2: Well structure complete — next 50% released.

- Final verification — all funds distributed transparently.

- Every step is visible on-chain, so anyone can see the flow of funds and project progress.

## 🛠️ Run Locally

```bash
# 1. Clone repo
git clone https://github.com/yourusername/fundtrack.git
cd fundtrack

# 2. Install dependencies
yarn install

# 3. Start local blockchain
yarn chain

# 4. Deploy smart contracts
yarn deploy

# 5. Run frontend
yarn start
