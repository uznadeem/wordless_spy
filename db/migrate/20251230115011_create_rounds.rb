class CreateRounds < ActiveRecord::Migration[8.0]
  def change
    create_table :rounds do |t|
      t.integer :round_number, default:1
      t.references :game, null: false, foreign_key: true
      t.jsonb :votes, default: {
        "1" => nil,
        "2" => nil,
        "3" => nil,
        "4" => nil,
        "5" => nil,
        "6" => nil,
      }
      t.integer :status, default: 0, null:false
      t.references :eliminated_player, foreign_key: {to_table: :users}
      t.timestamps
    end
  end
end
