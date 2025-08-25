# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_08_15_134807) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "games", force: :cascade do |t|
    t.bigint "room_id", null: false
    t.string "villagers_word"
    t.string "words_list", default: [], array: true
    t.jsonb "players_hash", default: {"1" => [nil, "alive"], "2" => [nil, "alive"], "3" => [nil, "alive"], "4" => [nil, "alive"], "5" => [nil, "alive"], "6" => [nil, "alive"]}
    t.integer "status", default: 0, null: false
    t.integer "result"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "category"
    t.bigint "spy_id"
    t.index ["room_id"], name: "index_games_on_room_id"
    t.index ["spy_id"], name: "index_games_on_spy_id"
  end

  create_table "rooms", force: :cascade do |t|
    t.string "name"
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "current_game_id"
    t.index ["current_game_id"], name: "index_rooms_on_current_game_id", unique: true
    t.index ["name"], name: "index_rooms_on_name", unique: true
    t.index ["user_id"], name: "index_rooms_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "games", "rooms"
  add_foreign_key "games", "users", column: "spy_id"
  add_foreign_key "rooms", "games", column: "current_game_id"
  add_foreign_key "rooms", "users"
end
