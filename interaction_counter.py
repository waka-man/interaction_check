import re
import json
from collections import defaultdict, OrderedDict
from datetime import datetime, timedelta

with open('config.json', 'r', encoding='utf-8') as config_file:
    config = json.load(config_file)

transcript_file = config.get('transcript_file', 'transcript.txt')
teacher_name = config.get('teacher_name', 'Wakuma Tekalign Debela')
chat_file = config.get('chat_file', 'chat.txt')

with open(f'{transcript_file}', 'r', encoding='utf-8') as transcript:
    transcript_content = transcript.read()

# Use regular expressions to find the attendees section
attendees_match = re.search(r'Attendees\s*(.*?)\nTranscript', transcript_content, re.DOTALL)
if not attendees_match:
    print("Could not find the Attendees section.")
    exit()

attendees_text = attendees_match.group(1).strip()
attendees_list = [name.strip() for name in attendees_text.split(',') if name.strip()]

# Exclude non-attendee entries
entries_to_exclude = ["read.ai meeting notes", f"{teacher_name}'s Presentation"]
attendees_list = [name for name in attendees_list if name not in entries_to_exclude]

# Normalize attendee names for consistent matching
def normalize_name(name):
    return ' '.join(name.lower().strip().split())

normalized_attendees = set(normalize_name(name) for name in attendees_list)

normalized_teacher_name = normalize_name(teacher_name)

# Extract the transcript text
transcript_match = re.search(r'Transcript\s*(.*)', transcript_content, re.DOTALL)
if not transcript_match:
    print("Could not find the Transcript section.")
    exit()

transcript_text = transcript_match.group(1).strip()
transcript_lines = transcript_text.split('\n')

interaction_counts = {normalize_name(name): 0 for name in attendees_list}
participation_over_time = defaultdict(set)

# Regular expression pattern to match timestamps (e.g., '00:05:00' or '00:05:00')
timestamp_pattern = re.compile(r'^\d{2}:\d{2}:\d{2}$')

current_time = None
for line in transcript_lines:
    line = line.strip()
    # Skip empty lines
    if not line:
        continue
    # capture timestamps
    if timestamp_pattern.match(line):
        current_time = line
        continue
    # Process lines that contain ':'
    if ':' in line:
        # Split line into speaker and message
        speaker_part, _ = line.split(':', 1)
        speaker = normalize_name(speaker_part)
        # Skip counting if speaker is the teacher
        if speaker == normalized_teacher_name:
            continue
        # Increment count if speaker is an attendee
        if speaker in interaction_counts:
            interaction_counts[speaker] += 1
            if current_time:
                participation_over_time[current_time].add(speaker)
    else:
        # Handle lines that may be continuations of previous messages
        continue

# Extract chat interactions
with open(chat_file, 'r', encoding='utf-8') as f:
    chat_lines = f.readlines()

chat_timestamp_pattern = re.compile(r'^\d{2}:\d{2}:\d{2}\.\d{3},\d{2}:\d{2}:\d{2}\.\d{3}$')
for i in range(len(chat_lines)):
    line = chat_lines[i].strip()
    
    # Check if line matches timestamp pattern
    if chat_timestamp_pattern.match(line):
        if i + 1 < len(chat_lines):
            chat_message = chat_lines[i + 1].strip()
            if ':' in chat_message:
                speaker_part, _ = chat_message.split(':', 1)
                speaker = normalize_name(speaker_part)
                
                if speaker == normalized_teacher_name:
                    continue
                
                if speaker in interaction_counts:
                    interaction_counts[speaker] += 1
                    chat_time = line[:8]  # Only keep the time portion
                    participation_over_time[chat_time].add(speaker)

# Convert timestamps to datetime objects and calculate participation over 10-minute intervals
interval_duration = timedelta(minutes=10)
start_time = datetime.strptime("00:00:00", "%H:%M:%S")
aggregated_participation = defaultdict(set)

# Aggregate participation based on defined intervals
for time_str, speakers in participation_over_time.items():
    time_obj = datetime.strptime(time_str, "%H:%M:%S")
    interval_start = start_time + ((time_obj - start_time) // interval_duration) * interval_duration
    interval_label = interval_start.strftime("%H:%M:%S")
    aggregated_participation[interval_label].update(speakers)

# Convert sets to counts for participation over time
participation_over_time_counts = {interval: len(participants) for interval, participants in aggregated_participation.items()}

#sort it
participation_over_time_counts = OrderedDict(sorted(participation_over_time_counts.items(), key=lambda t: datetime.strptime(t[0], "%H:%M:%S")))

for attendee in attendees_list:
    normalized_name_attendee = normalize_name(attendee)
    count = interaction_counts.get(normalized_name_attendee, 0)

non_participants = [attendee for attendee in attendees_list if interaction_counts[normalize_name(attendee)] == 0]


output_data = {
    "interaction_counts": interaction_counts,
    "non_participants": non_participants,
    "participation_over_time": participation_over_time_counts
}

with open('output.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=4)

print("Interaction counts, non-participants and participation over time saved to output.json.")