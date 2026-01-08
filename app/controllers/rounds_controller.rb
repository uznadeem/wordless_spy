class RoundsController < ApplicationController
  before_action :set_round, only: %i[ update vote_out]
  
  def update
    voter_id = params[:voterId].to_s
    voted_id = params[:votedId]

    votes = @round.votes || {}
    
    votes[voter_id] = voted_id&.to_s

    @round.update!(votes: votes)
    @round.get_vote_broadcast_to_all(voter_id,voted_id)
  end
  
  def vote_out
    return head :ok if @round.ended?
    @round.vote_out_spy
  end

  private

  def set_round
    @round = Round.find(params[:id])
  end

end
