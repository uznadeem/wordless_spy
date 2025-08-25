class CreateGames < ActiveRecord::Migration[8.0]
  def change
    create_table :games do |t|
      t.references :room, null: false, foreign_key: true

      t.string :villagers_word

      t.string :words_list, array: true, default: []
      t.jsonb :players_hash, default: { 1 => [ nil, "alive" ], 2 => [ nil, "alive" ], 3 => [ nil, "alive" ], 4 => [ nil, "alive" ], 5 => [ nil, "alive" ], 6 => [ nil, "alive" ] }

      t.integer :status, null: false, default: 0
      t.integer :result

      t.timestamps
    end
  end
end
