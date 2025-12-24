class GamesController < ApplicationController
  before_action :set_game, only: %i[ start update ]

  def start
    @game.initialize_new_game
  end

  def update
    if params[:knife_action] == "knife_target"
      target_seat = params[:target_seat]
      @game.kill_player(target_seat)
    elsif params[:spy_word_guess].present?
      selected_word = params[:spy_word_guess]
      @game.spy_guess_word(selected_word)
    end

    head :ok
  end

  private

  def set_game
    @game = Game.find_by(id: params[:id])
  end
end
