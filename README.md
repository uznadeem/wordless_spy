# Wordless Spy 🎭

A 6-player social deduction game built with Ruby on Rails.  

- **5 Villagers** share the same secret word.  
- **1 Spy** has no clue what the word is.  
- The challenge: villagers must describe the word without giving it away too easily, while the spy tries to blend in and avoid detection.

---

## 🕹️ Gameplay

1. **Setup**  
   - The game starts with **6 players**.  
   - One is randomly chosen as the **Spy**.  
   - A random category is selected from 4 available categories.  
   - A secret word is shown to all **villagers** — but not to the spy.  

2. **Turn Phase**  
   - Villagers and the spy take turns describing the word.  
   - The spy must fake it, trying not to be caught while guessing based on villagers’ hints.  

3. **Voting Phase**  
   - After discussion, all players vote for who they believe is the spy.  
   - If the villagers find the spy → the spy gets one last chance.  

4. **Spy’s Last Chance**  
   - The spy is shown **8 possible words** (one is correct).  
   - If the spy guesses correctly → **Spy wins**.  
   - If not → **Villagers win**.  

5. **Auto-Win Condition**  
   - If only **2 players remain** (1 villager + 1 spy), the **Spy wins automatically**.

---

## 🛠️ Tech Stack

- **Ruby on Rails** (backend + game logic)
- **Action Cable + Redis** (real-time updates)
- **PostgreSQL** (database)
- **Bootstrap / JS** (frontend styling + interactions)

---

## 🚀 Getting Started

### Prerequisites
- Ruby (check `.ruby-version`)
- Bundler
- Node.js + Yarn
- PostgreSQL

### Setup

```bash
# Clone it
git clone https://github.com/uznadeem/wordless_spy.git
cd wordless_spy

# Install gems
bundle install

# Set up DB
rails db:create
rails db:migrate
rails db:seed

# Run server
rails server
