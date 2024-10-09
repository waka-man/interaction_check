import re
import json
from collections import defaultdict, OrderedDict
from datetime import datetime, timedelta

# Load configuration from config.json
with open('config.json', 'r', encoding='utf-8') as config_file:
    config = json.load(config_file)

# Extract configuration values
transcript_files = config.get('transcript_files', [])
chat_files = config.get('chat_files', [])
teacher_name = config.get('teacher_name', 'Teacher Name')

# Load special students from special_students.txt
try:
    with open('special_students.txt', 'r', encoding='utf-8') as special_students_file:
        special_students = [line.strip() for line in special_students_file if line.strip()]
except FileNotFoundError:
    print("File not found: special_students.txt")
    special_students = []

# Normalize attendee names for consistent matching
def normalize_name(name):
    return ' '.join(name.lower().strip().split())

# Function to extract date from the transcript content
def extract_date_from_first_line(content):
    first_line = content.split('\n', 1)[0]
    date_match = re.search(r'\b(\d{4}/\d{2}/\d{2})\b', first_line)
    if date_match:
        return date_match.group(1)
    return None

# Initialize aggregated data
interaction_counts = defaultdict(int)
participation_over_time = defaultdict(set)
all_attendees = set()
special_students_data = defaultdict(lambda: defaultdict(int))

# Data by date
data_by_date = {}

# Process each transcript and chat file pair
for transcript_file, chat_file in zip(transcript_files, chat_files):
    try:
        with open(transcript_file, 'r', encoding='utf-8') as transcript:
            transcript_content = transcript.read()
    except FileNotFoundError:
        print(f"File not found: {transcript_file}")
        continue

    # Extract the date of the meeting from the first line
    meeting_date = extract_date_from_first_line(transcript_content)
    if not meeting_date:
        print(f"Could not find the date in {transcript_file}. Assigning 'unknown_date'.")
        meeting_date = "unknown_date"

    # Use regular expressions to find the attendees section
    attendees_match = re.search(r'Attendees\s*(.*?)\nTranscript', transcript_content, re.DOTALL)
    if not attendees_match:
        print(f"Could not find the Attendees section in {transcript_file}.")
        continue

    attendees_text = attendees_match.group(1).strip()
    attendees_list = [name.strip() for name in attendees_text.split(',') if name.strip()]
    all_attendees.update(attendees_list)

    # Exclude non-attendee entries
    entries_to_exclude = ["read.ai meeting notes", f"{teacher_name}'s Presentation"]
    attendees_list = [name for name in attendees_list if name not in entries_to_exclude]

    normalized_attendees = set(normalize_name(name) for name in attendees_list)
    normalized_teacher_name = normalize_name(teacher_name)

    # Extract the transcript text
    transcript_match = re.search(r'Transcript\s*(.*)', transcript_content, re.DOTALL)
    if not transcript_match:
        print(f"Could not find the Transcript section in {transcript_file}.")
        continue

    transcript_text = transcript_match.group(1).strip()
    transcript_lines = transcript_text.split('\n')

    # Regular expression pattern to match timestamps (e.g., '00:05:00')
    timestamp_pattern = re.compile(r'^\d{2}:\d{2}:\d{2}$')

    current_time = None
    date_interaction_counts = defaultdict(int)
    date_participation_over_time = defaultdict(set)

    for line in transcript_lines:
        line = line.strip()
        if not line:
            continue
        if timestamp_pattern.match(line):
            current_time = line
            continue
        if ':' in line:
            speaker_part, _ = line.split(':', 1)
            speaker = normalize_name(speaker_part)
            if speaker == normalized_teacher_name:
                continue
            if speaker in normalized_attendees:
                interaction_counts[speaker] += 1
                date_interaction_counts[speaker] += 1
                if current_time:
                    participation_over_time[current_time].add(speaker)
                    date_participation_over_time[current_time].add(speaker)

                # Check if the speaker is a special student
                for special_student in special_students:
                    if any(name_part in speaker for name_part in special_student.lower().split()):
                        special_students_data[special_student][meeting_date] += 1

    # Aggregate participation data by date
    participants = set(date_interaction_counts.keys())
    non_participants = [attendee for attendee in attendees_list if normalize_name(attendee) not in participants]

    data_by_date[meeting_date] = {
        "interaction_counts": dict(date_interaction_counts),
        "participation_over_time": {
            interval: len(participants)
            for interval, participants in date_participation_over_time.items()
        },
        "non_participants": non_participants,
        "total_participants": len(participants),
        "total_non_participants": len(non_participants)
    }

# Aggregate participation over all intervals
aggregated_participation = defaultdict(set)
for time_str, speakers in participation_over_time.items():
    time_obj = datetime.strptime(time_str, "%H:%M:%S")
    interval_duration = timedelta(minutes=10)
    start_time = datetime.strptime("00:00:00", "%H:%M:%S")
    interval_start = start_time + ((time_obj - start_time) // interval_duration) * interval_duration
    interval_label = interval_start.strftime("%H:%M:%S")
    aggregated_participation[interval_label].update(speakers)

# Convert sets to counts for participation over time
participation_over_time_counts = OrderedDict(
    sorted({interval: len(participants) for interval, participants in aggregated_participation.items()}.items(),
           key=lambda t: datetime.strptime(t[0], "%H:%M:%S"))
)

# Create a list of non-participants
non_participants = [attendee for attendee in all_attendees if normalize_name(attendee) not in interaction_counts]

# Output data to JSON for JavaScript to use
output_data = {
    "aggregate": {
        "interaction_counts": dict(interaction_counts),
        "non_participants": non_participants,
        "participation_over_time": participation_over_time_counts,
        "total_participants": len(interaction_counts),
        "total_non_participants": len(non_participants)
    },
    "by_date": data_by_date,
    "special_students": {
        student: dict(attendance) for student, attendance in special_students_data.items()
    }
}

with open('output.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=4)

print("Interaction counts, non-participants, and participation over time saved to output.json.")