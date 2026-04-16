from pydantic import BaseModel
from typing import Optional, List


class CollegeTrackedCreate(BaseModel):
    college_id: str
    notes: Optional[str] = ""


class EmailLogCreate(BaseModel):
    college_id: str
    direction: str
    subject: str
    body: str
    coach_name: Optional[str] = ""
    coach_email: Optional[str] = ""
    message_type: Optional[str] = ""


class AIMessageRequest(BaseModel):
    college_name: str
    coach_name: str
    division: str
    user_name: str = "Player"
    user_position: str = "point guard"
    user_secondary_position: Optional[str] = ""
    user_stats: Optional[str] = ""
    user_email: Optional[str] = ""
    user_phone: Optional[str] = ""
    highlight_tape_url: Optional[str] = ""
    message_type: str = "initial_outreach"


class AIStrategyRequest(BaseModel):
    college_name: str
    coach_name: str
    last_contact_date: Optional[str] = ""
    response_status: str = "no_response"


class BulkEmailImport(BaseModel):
    college_ids: list
    direction: str = "sent"
    subject: str
    body: str
    coach_name: Optional[str] = ""
    sent_date: Optional[str] = ""


class ReplyLogRequest(BaseModel):
    college_id: str
    subject: Optional[str] = ""
    body: str
    coach_name: Optional[str] = ""
    coach_email: Optional[str] = ""
    received_date: Optional[str] = ""
    outcome: Optional[str] = ""  # interested | schedule_call | rejected | scholarship_offered


class FollowUpRequest(BaseModel):
    college_name: str
    coach_name: str
    reply_content: str
    original_subject: Optional[str] = ""


class ReplyNextStepsRequest(BaseModel):
    college_name: str
    reply_body: Optional[str] = ""
    outcome: Optional[str] = ""
    coach_name: Optional[str] = "Coach"
    division: Optional[str] = ""


class PlayerProfile(BaseModel):
    full_name: Optional[str] = ""
    date_of_birth: Optional[str] = ""
    nationality: Optional[str] = ""
    hometown: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    height_ft: Optional[str] = ""
    height_cm: Optional[str] = ""
    weight_kg: Optional[str] = ""
    wingspan_cm: Optional[str] = ""
    position: Optional[str] = ""
    primary_position: Optional[str] = ""
    secondary_position: Optional[str] = ""
    dominant_hand: Optional[str] = ""
    current_team: Optional[str] = ""
    club_team: Optional[str] = ""
    jersey_number: Optional[str] = ""
    years_playing: Optional[str] = ""
    # General / overall stats (legacy)
    ppg: Optional[str] = ""
    apg: Optional[str] = ""
    rpg: Optional[str] = ""
    spg: Optional[str] = ""
    fg_percent: Optional[str] = ""
    three_pt_percent: Optional[str] = ""
    # College-level stats
    college_ppg: Optional[str] = ""
    college_apg: Optional[str] = ""
    college_rpg: Optional[str] = ""
    college_spg: Optional[str] = ""
    college_fg_percent: Optional[str] = ""
    college_three_pt_percent: Optional[str] = ""
    # Academy / Club stats
    academy_ppg: Optional[str] = ""
    academy_apg: Optional[str] = ""
    academy_rpg: Optional[str] = ""
    academy_spg: Optional[str] = ""
    academy_fg_percent: Optional[str] = ""
    academy_three_pt_percent: Optional[str] = ""
    # Country / National team stats
    country_ppg: Optional[str] = ""
    country_apg: Optional[str] = ""
    country_rpg: Optional[str] = ""
    country_spg: Optional[str] = ""
    country_fg_percent: Optional[str] = ""
    country_three_pt_percent: Optional[str] = ""
    current_school: Optional[str] = ""
    school_year: Optional[str] = ""
    expected_graduation: Optional[str] = ""
    gcse_grades: Optional[str] = ""
    a_level_subjects: Optional[str] = ""
    predicted_grades: Optional[str] = ""
    gpa_equivalent: Optional[str] = ""
    intended_major: Optional[str] = ""
    sat_score: Optional[str] = ""
    act_score: Optional[str] = ""
    target_start_year: Optional[str] = ""
    target_division: Optional[str] = ""
    ncaa_id: Optional[str] = ""
    ncaa_registered: Optional[bool] = False
    highlight_tape_url: Optional[str] = ""
    bio: Optional[str] = ""
    instagram: Optional[str] = ""
    twitter: Optional[str] = ""


class NCAACHeckRequest(BaseModel):
    gcse_grades: Optional[str] = ""
    a_level_grades: Optional[str] = ""
    predicted_grades: Optional[str] = ""
    core_subjects_completed: bool = True
    competitive_level: str = "national"
    years_played: int = 5
    has_club_team: bool = True
    paid_to_play: bool = False
    received_award_money: bool = False
    played_on_pro_contract: bool = False
    agent_representation: bool = False
    social_media_monetised: bool = False


class ChecklistUpdate(BaseModel):
    items: List[dict]


class EmailTemplateCreate(BaseModel):
    name: str
    subject: str
    body: str
    message_type: str = "initial_outreach"


class CallNoteCreate(BaseModel):
    content: str
    date: Optional[str] = ""


class WeeklyGoalsUpdate(BaseModel):
    emails_sent: int = 0
    follow_ups: int = 0
    new_tracks: int = 0
    calls: int = 0
