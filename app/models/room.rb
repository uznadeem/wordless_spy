class Room < ApplicationRecord
  acts_as_paranoid
 
  validates :name, presence: true, uniqueness: true

  after_create :assign_new_game

  has_one :current_game, class_name: "Game"

  has_many :games

  belongs_to :user
  
  scope :latest, ->(limit = 10) { order(created_at: :desc).limit(limit) }

  def assign_new_game
    update_columns(current_game_id: games.create!.id)
  end
end
