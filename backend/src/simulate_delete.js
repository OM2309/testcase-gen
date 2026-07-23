import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { projectService } from './modules/project/project.service.js';
import Project from './modules/project/project.model.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const projectId = '6a609431fec5b8c8abfc8aaa'; // APA Admin Data Upload Module
  const project = await Project.findById(projectId);
  if (!project) {
    console.error('Project not found in DB!');
    await mongoose.disconnect();
    return;
  }
  
  const mockUser = {
    id: '6a59c2c167319e71c3a2c72a',
    role: 'project_manager'
  };

  try {
    console.log('Attempting deleteProject...');
    // We run it in dry-run mode by checking if it throws
    // (Wait, we can comment out the actual deletes or let it delete and check success)
    await projectService.deleteProject(project, mockUser);
    console.log('deleteProject completed successfully!');
  } catch (err) {
    console.error('Error during deleteProject:', err);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
