class AddCurrentRoundIdToGames < ActiveRecord::Migration[8.0]
  def change
    add_column :games, :current_round_id, :integer
  end
end
