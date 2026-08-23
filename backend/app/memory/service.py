import re
from typing import List, Dict, Any, Optional, Tuple
from app.memory.repository import MemoryRepository


class MemoryService:
    """
    Facade service managing memory extraction, retrieval, and persistence operations.
    """

    def __init__(self, repo: Optional[MemoryRepository] = None):
        self._repo = repo or MemoryRepository()

    # --- Basic CRUD Facade ---
    def add_memory(self, content: str, category: str = "preference", importance: int = 3) -> Dict[str, Any]:
        return self._repo.add(category=category, content=content, importance=importance)

    def list_memories(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        return self._repo.list_all(category=category)

    def get_memory(self, memory_id: int) -> Optional[Dict[str, Any]]:
        return self._repo.get_by_id(memory_id)

    def delete_memory(self, memory_id: int) -> bool:
        return self._repo.delete_by_id(memory_id)

    # --- Command & Pattern Extraction ---
    def check_and_handle_explicit_commands(self, user_text: str) -> Tuple[bool, Optional[str]]:
        """
        Check if user_text contains an explicit 'Remember that...' or 'Forget that...' command.
        
        :return: (is_handled: bool, response_message: str | None)
        """
        text = user_text.strip()
        lower_text = text.lower()

        # 1. Handle Explicit Forget Command
        forget_patterns = [
            r"^forget\s+that\s+(.+)",
            r"^forget\s+(.+)",
            r"^delete\s+memory\s+about\s+(.+)",
            r"^remove\s+memory\s+(.+)"
        ]

        for pattern in forget_patterns:
            match = re.match(pattern, text, re.IGNORECASE)
            if match:
                target_keyword = match.group(1).strip().strip(".!")
                deleted_count = self._repo.delete_by_content_keyword(target_keyword)
                if deleted_count > 0:
                    return True, f"I've removed that from my memory. (Deleted {deleted_count} memory item{'s' if deleted_count > 1 else ''})."
                else:
                    return True, f"I couldn't find any stored memory matching '{target_keyword}'."

        # 2. Handle Explicit Remember Command
        remember_patterns = [
            r"^remember\s+that\s+(.+)",
            r"^remember\s+to\s+(.+)",
            r"^remember\s+(.+)",
            r"^please\s+remember\s+that\s+(.+)"
        ]

        for pattern in remember_patterns:
            match = re.match(pattern, text, re.IGNORECASE)
            if match:
                raw_memory = match.group(1).strip().strip(".!")
                if raw_memory:
                    # Categorize preference vs fact
                    category = "preference" if any(w in raw_memory.lower() for w in ["prefer", "like", "want", "hate", "avoid"]) else "fact"
                    self.add_memory(content=raw_memory, category=category, importance=4)
                    return True, f"I'll remember that. Saved: \"{raw_memory}\""

        return False, None

    def auto_extract_personal_facts(self, user_text: str):
        """
        Conservatively extract personal profile statements (e.g. 'My name is X', 'I am studying Y').
        """
        text = user_text.strip()
        
        fact_patterns = [
            (r"^my\s+name\s+is\s+([A-Za-z0-9\s]+)", "profile", "My name is {}"),
            (r"^i\s+am\s+studying\s+([A-Za-z0-9\s/]+)", "fact", "I am studying {}"),
            (r"^i\s+am\s+currently\s+building\s+([A-Za-z0-9\s/]+)", "goal", "Building {}"),
            (r"^i\s+work\s+as\s+a\s+([A-Za-z0-9\s]+)", "profile", "Works as {}"),
        ]

        for pattern, category, fmt in fact_patterns:
            match = re.match(pattern, text, re.IGNORECASE)
            if match:
                extracted_val = match.group(1).strip().strip(".!")
                if extracted_val:
                    content_str = fmt.format(extracted_val)
                    # Check existing to prevent duplicate spam
                    existing = self._repo.search(extracted_val, limit=1)
                    if not existing:
                        self.add_memory(content=content_str, category=category, importance=4)

    # --- Prompt Context Formatting ---
    def get_memory_context_for_prompt(self, user_text: str) -> str:
        """
        Retrieve all stored memories and format them cleanly for inclusion in the LLM prompt.
        """
        all_memories = self.list_memories()
        if not all_memories:
            return ""

        context_lines = ["\nUSER PERSONAL MEMORIES (Stored Information):"]
        for mem in all_memories:
            cat = mem.get("category", "fact").upper()
            content = mem.get("content", "")
            context_lines.append(f"- [{cat}] {content}")

        context_lines.append("Use these stored memories as factual user context when responding.\n")
        return "\n".join(context_lines)
